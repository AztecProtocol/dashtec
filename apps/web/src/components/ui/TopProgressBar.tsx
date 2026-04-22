import { Suspense, useEffect, useRef } from 'react';
import NProgress from 'nprogress';
import { useLoading } from '@/context/LoadingContext';
import { usePathname, useSearchParams } from 'next/navigation';

export function ProgressBar() {
  const { isLoading } = useLoading();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const previousPath = useRef(pathname + searchParams.toString());

  useEffect(() => {
    NProgress.configure({ showSpinner: false });
  }, []);

   useEffect(() => {
    const currentPath = pathname + searchParams.toString();

    // When the path changes, start the progress bar
    if (previousPath.current !== currentPath) {
      NProgress.start();
    }

    // A timeout is used to ensure the progress bar is visible for a brief moment
    // and to account for rendering delays.
    const timer = setTimeout(() => {
      if (!isLoading) {
        NProgress.done();
      }
      previousPath.current = currentPath;
    }, 200);

    return () => {
      clearTimeout(timer);
    };
  }, [pathname, searchParams, isLoading]);

  useEffect(() => {
    if (isLoading) {
      NProgress.start();
    } else {
      NProgress.done();
    }
  }, [isLoading]);

  return null;
}

export function TopProgressBar() {
  // Using Suspense is crucial because usePathname and useSearchParams
  // can suspend during pre-rendering.
  return <Suspense><ProgressBar /></Suspense>;
}