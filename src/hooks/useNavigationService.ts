import { useEffect } from 'react';
import { usePathname, useRouter } from 'expo-router';
import { navigationService } from '@/src/services/navigation/navigationService';

/**
 * Hook to register router instance with navigation service
 * and keep current route in sync.
 */
export function useNavigationService(): void {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    navigationService.setRouter({
      replace: (route: string) => {
        router.replace(route as Parameters<typeof router.replace>[0]);
      },
    });
  }, [router]);

  useEffect(() => {
    navigationService.setCurrentRoute(pathname);
  }, [pathname]);
}
