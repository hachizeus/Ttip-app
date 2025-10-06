interface BannerImage {
  id: string
  url: string
  title?: string
}

const defaultBanners: BannerImage[] = [
  {
    id: '1',
    url: 'https://cpbonffjhrckiiqbsopt.supabase.co/storage/v1/object/public/banners/banner1.jpg'
  },
  {
    id: '2', 
    url: 'https://cpbonffjhrckiiqbsopt.supabase.co/storage/v1/object/public/banners/banner2.jpg'
  },
  {
    id: '3',
    url: 'https://cpbonffjhrckiiqbsopt.supabase.co/storage/v1/object/public/banners/banner3.jpg'
  },
  {
    id: '4',
    url: 'https://cpbonffjhrckiiqbsopt.supabase.co/storage/v1/object/public/banners/banner4.jpg'
  }
]

export const fetchBannerImages = async (): Promise<BannerImage[]> => {
  // Return banners directly for now - can add API call later
  return defaultBanners
}

export type { BannerImage }