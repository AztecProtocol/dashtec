package integrity

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

// Helper to create slot records for testing
func makeRecords(statuses map[string]int, validator string) []SlotRecord {
	var records []SlotRecord
	for status, count := range statuses {
		for i := 0; i < count; i++ {
			records = append(records, SlotRecord{
				Slot:      "slot",
				Status:    status,
				Validator: validator,
			})
		}
	}
	return records
}

func TestAnalyzeEpochIntegrity_PerfectEpoch(t *testing.T) {
	// Perfect epoch: 32 slots, 1 validator, all blocks mined
	records := makeRecords(map[string]int{
		"block-mined": 32,
	}, "validator1")

	result := AnalyzeEpochIntegrity(EpochAnalysisInput{
		EpochNumber:                1,
		Records:                    records,
		ExpectedValidatorsPerEpoch: 1,
		SlotsPerEpoch:              32,
	})

	assert.Equal(t, 100, result.IntegrityScore)
	assert.Equal(t, "VALID", result.IntegrityStatus)
	assert.Empty(t, result.Issues)
}

func TestAnalyzeEpochIntegrity_TooManyValidators(t *testing.T) {
	// Rule 1: More validators than expected triggers -40 penalty
	var records []SlotRecord
	for i := 0; i < 15; i++ {
		records = append(records, SlotRecord{
			Slot:      "slot",
			Status:    "block-mined",
			Validator: "validator" + string(rune('A'+i)),
		})
	}

	result := AnalyzeEpochIntegrity(EpochAnalysisInput{
		EpochNumber:                1,
		Records:                    records,
		ExpectedValidatorsPerEpoch: 10,
		SlotsPerEpoch:              15,
	})

	assert.Less(t, result.IntegrityScore, 100)
	assert.Contains(t, result.Issues, "Has too many unique validators")
}

func TestAnalyzeEpochIntegrity_BlockCountMismatch(t *testing.T) {
	// Rule 2: Block records don't match SlotsPerEpoch
	records := makeRecords(map[string]int{
		"block-mined": 28, // Only 28 of 32
	}, "validator1")

	result := AnalyzeEpochIntegrity(EpochAnalysisInput{
		EpochNumber:                1,
		Records:                    records,
		ExpectedValidatorsPerEpoch: 1,
		SlotsPerEpoch:              32,
	})

	assert.Less(t, result.IntegrityScore, 100)
	assert.Contains(t, result.Issues, "Block record count mismatch")
}

func TestAnalyzeEpochIntegrity_AttestationMismatch(t *testing.T) {
	// Rule 3: Attestation count mismatch
	records := makeRecords(map[string]int{
		"block-mined":      32,
		"attestation-sent": 100, // Not matching expected
	}, "validator1")

	result := AnalyzeEpochIntegrity(EpochAnalysisInput{
		EpochNumber:                1,
		Records:                    records,
		ExpectedValidatorsPerEpoch: 10,
		SlotsPerEpoch:              32,
	})

	assert.Contains(t, result.Issues, "Attestation count mismatch")
}

func TestAnalyzeEpochIntegrity_EmptyValidators(t *testing.T) {
	// Rule 4: Empty validators with no block-missed
	records := makeRecords(map[string]int{
		"block-mined": 32,
	}, "") // Empty validator string

	result := AnalyzeEpochIntegrity(EpochAnalysisInput{
		EpochNumber:                1,
		Records:                    records,
		ExpectedValidatorsPerEpoch: 10,
		SlotsPerEpoch:              32,
	})

	assert.Greater(t, result.EmptyValidators, 0)
	assert.Contains(t, result.Issues, "Has empty validators with no block-missed")
}

func TestAnalyzeEpochIntegrity_StatusThresholds(t *testing.T) {
	tests := []struct {
		name           string
		blockMined     int
		expectedStatus string
	}{
		{"VALID", 32, "VALID"},
		{"WARNING", 31, "WARNING"},
		{"PARTIAL", 20, "PARTIAL"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			records := makeRecords(map[string]int{
				"block-mined": tt.blockMined,
			}, "validator1")

			result := AnalyzeEpochIntegrity(EpochAnalysisInput{
				EpochNumber:                1,
				Records:                    records,
				ExpectedValidatorsPerEpoch: 1,
				SlotsPerEpoch:              32,
			})

			assert.Equal(t, tt.expectedStatus, result.IntegrityStatus)
		})
	}
}
