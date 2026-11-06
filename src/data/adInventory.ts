/**
 * Ad Creative Inventory for SSAI (Server-Side Ad Insertion) & SCTE-35 Ingest
 * Provides verified high-definition commercial spots with zero CORS issues,
 * plus customizable advertiser metadata and CTA links.
 */

export interface AdCreative {
  id: string;
  title: string;
  advertiser: string;
  category: 'tech' | 'sports' | 'automotive' | 'luxury' | 'business';
  durationSeconds: number;
  videoUrl: string;
  thumbnailUrl: string;
  callToActionUrl: string;
  callToActionText: string;
  description: string;
  isCustom?: boolean;
}

export const VERIFIED_AD_INVENTORY: AdCreative[] = [
  {
    id: 'ad-google-cloud',
    title: 'Google Cloud AI: Build Next-Gen Multimodal Applications',
    advertiser: 'Google Cloud AI',
    category: 'tech',
    durationSeconds: 15,
    // Reliable, fast-loading direct MP4 video asset
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80',
    callToActionUrl: 'https://cloud.google.com/ai',
    callToActionText: 'Explore Gemini Models',
    description: 'Scalable GPU clusters, TPU v5e accelerators, and Gemini 1.5 Pro reasoning models.',
  },
  {
    id: 'ad-apex-motors',
    title: 'Formula Apex EV: 0 to 100 in 1.8s · Pure Electric Aerodynamics',
    advertiser: 'Apex Automotive',
    category: 'automotive',
    durationSeconds: 30,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=800&q=80',
    callToActionUrl: 'https://apex-racing.example.com',
    callToActionText: 'Configure Your Track Edition',
    description: 'Active active-downforce carbon fiber chassis engineered for high-speed endurance.',
  },
  {
    id: 'ad-chronos-swiss',
    title: 'Chronos Geneve: Official Timekeeper of Apex Digital TV Network',
    advertiser: 'Chronos Engineering',
    category: 'luxury',
    durationSeconds: 15,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=800&q=80',
    callToActionUrl: 'https://chronos-watches.example.com',
    callToActionText: 'View Masterpiece Collection',
    description: 'Handcrafted titanium tourbillon movements certified to ±0.5 seconds per year.',
  },
  {
    id: 'ad-nike-sports',
    title: 'Nike Performance Lab: Unstoppable Speed & Athletic Analytics',
    advertiser: 'Nike Athletic Labs',
    category: 'sports',
    durationSeconds: 15,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80',
    callToActionUrl: 'https://nike.example.com',
    callToActionText: 'Shop Pro Series',
    description: 'Biomechanical footwear built for world championship sprinters and marathoners.',
  },
  {
    id: 'ad-starlight-quantum',
    title: 'Starlight Enterprise: Autonomous Cloud Cost & VRAM Optimization',
    advertiser: 'Starlight Computing',
    category: 'business',
    durationSeconds: 20,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80',
    callToActionUrl: 'https://starlight.example.com',
    callToActionText: 'Start Free 30-Day Trial',
    description: 'Real-time telemetry and automated pod autoscaling for hyperscale Kubernetes clusters.',
  },
];

const AD_INVENTORY_STORAGE_KEY = 'apex_ad_creative_inventory_v1';

export function getStoredAdInventory(): AdCreative[] {
  if (typeof window === 'undefined') return VERIFIED_AD_INVENTORY;
  try {
    const raw = localStorage.getItem(AD_INVENTORY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Merge with defaults to ensure verified entries exist
        const unique = new Map<string, AdCreative>();
        for (const item of parsed) {
          if (item?.id) unique.set(item.id, item);
        }
        for (const def of VERIFIED_AD_INVENTORY) {
          if (!unique.has(def.id)) unique.set(def.id, def);
        }
        return Array.from(unique.values());
      }
    }
  } catch (err) {
    console.warn('Could not read stored ad inventory:', err);
  }
  return VERIFIED_AD_INVENTORY;
}

export function saveAdInventoryToStorage(inventory: AdCreative[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(AD_INVENTORY_STORAGE_KEY, JSON.stringify(inventory));
  } catch (err) {
    console.warn('Could not save ad inventory to localStorage:', err);
  }
}
