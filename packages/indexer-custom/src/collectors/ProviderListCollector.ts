import { BaseCollector, HealthStatus } from '../lib/BaseCollector';
import { config } from '../config/config';
import { ProviderService } from '../services/ProviderService';

interface StakingAppProvider {
  id: string;
  identifier: string;
  name?: string;
  description?: string;
  website?: string;
  logo_url?: string;
  email?: string;
  discord?: string;
  admin: string;
  takeRate: number;
  rewardsRecipient: string;
  createdAt?: string;
  totalAttesters?: number;
  activeAttesters?: number;
  queuedAttesters?: number;
  activeStaked?: string;
}

/**
 * Provider List Collector
 *
 * Fetches provider data from the Staking App API and syncs to database
 * Only runs if STAKING_APP_API_URL is configured
 */
class ProviderListCollector extends BaseCollector {
  private readonly providerService!: ProviderService;
  private readonly stakingAppApiUrl: string | undefined;
  private readonly isEnabled: boolean;

  constructor() {
    super('ProviderListCollector', 4);

    this.stakingAppApiUrl = config.STAKING_APP_API_URL;
    this.isEnabled = !!this.stakingAppApiUrl;

    if (!this.isEnabled) {
      this.logger.warn('STAKING_APP_API_URL is not configured. Collector will not run.');
      return;
    }

    this.providerService = new ProviderService();

    this.logger.info('Initialized', {
      pollIntervalMs: config.PROVIDER_LIST_POLL_INTERVAL_MS || 60000,
      stakingAppApiUrl: this.stakingAppApiUrl,
    });
  }

  /**
   * Fetch providers from Staking App API
   */
  private async fetchProvidersFromApi(): Promise<StakingAppProvider[]> {
    try {
      const response = await fetch(`${this.stakingAppApiUrl}/providers`, {
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://aztec-staking.com/',
          'Origin': 'https://aztec-staking.com',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as any;

      // Handle different response formats
      if (Array.isArray(data)) {
        return data;
      } else if (data.data && Array.isArray(data.data)) {
        return data.data;
      } else if (data.providers && Array.isArray(data.providers)) {
        return data.providers;
      }

      this.logger.warn('Unexpected API response format', { data });
      return [];
    } catch (error) {
      this.logger.error('Failed to fetch providers from API', { error });
      throw error;
    }
  }

  /**
   * Process and store provider metadata
   */
  private async processProvider(provider: StakingAppProvider): Promise<void> {
    try {
      await this.providerService.upsertProviderMetadata({
        providerIdentifier: provider.id,
        name: provider.name,
        description: provider.description,
        website: provider.website,
        logoUrl: provider.logo_url,
        email: provider.email,
        discord: provider.discord,
      });
    } catch (error) {
      this.logger.error(`Failed to process provider ${provider.id}`, { error });
      throw error;
    }
  }

  async collectData(): Promise<void> {
    if (!this.isEnabled) {
      return;
    }

    if (this.metrics.isRunning) {
      this.logger.info('Collection already in progress. Skipping.');
      return;
    }

    this.startRun();
    const startTime = Date.now();

    try {
      this.logger.info('Fetching providers from Staking App API...');
      const providers = await this.fetchProvidersFromApi();
      this.logger.info(`Fetched ${providers.length} providers from API`);

      if (providers.length === 0) {
        this.logger.warn('No providers returned from API');
        this.recordSuccess(Date.now() - startTime);
        return;
      }

      let successCount = 0;
      let failCount = 0;

      for (const provider of providers) {
        try {
          await this.processProvider(provider);
          successCount++;
        } catch (error) {
          failCount++;
          this.logger.error(`Failed to process provider ${provider.identifier}`, { error });
        }
      }

      this.logger.info(`Processing complete: ${successCount} successful, ${failCount} failed`);
      this.recordSuccess(Date.now() - startTime);
    } catch (error) {
      await this.recordError(error instanceof Error ? error.message : String(error));
      this.logger.error('Collection failed', { error });
    } finally {
      this.metrics.isRunning = false;
    }
  }

  async start(): Promise<void> {
    if (!this.isEnabled) {
      this.logger.info('Collector is disabled (STAKING_APP_API_URL not configured)');
      return;
    }

    const pollInterval = config.PROVIDER_LIST_POLL_INTERVAL_MS || 60000;
    this.logger.info(`Started. Polling every ${pollInterval / 1000}s`);

    this.collectData().catch(err => this.logger.error('Initial collection failed', { err }));
    setInterval(() => this.collectData().catch(err => this.logger.error('Collection failed', { err })), pollInterval);
  }

  protected async checkDependencies(): Promise<HealthStatus['dependencies']> {
    if (!this.isEnabled) {
      return {
        api: { status: 'HEALTHY', message: 'Collector disabled - STAKING_APP_API_URL not configured', timestamp: new Date().toISOString() }
      };
    }

    const [dbHealth, apiHealth] = await Promise.all([
      this.checkDatabaseHealth(),
      this.checkHttpHealth(this.stakingAppApiUrl!, '/providers'),
    ]);
    return { database: dbHealth, api: apiHealth };
  }
}

export { ProviderListCollector };


