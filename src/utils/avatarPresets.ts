/**
 * Avatar Presets and Image Compression Utilities
 */

export interface AvatarPreset {
  id: string;
  name: string;
  url: string;
  category: 'women' | 'men' | 'abstract' | 'minimal';
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  // Women
  {
    id: 'w1',
    name: 'Maya',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    category: 'women',
  },
  {
    id: 'w2',
    name: 'Priya',
    url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80',
    category: 'women',
  },
  {
    id: 'w3',
    name: 'Ananya',
    url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80',
    category: 'women',
  },
  {
    id: 'w4',
    name: 'Sneha',
    url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&auto=format&fit=crop&q=80',
    category: 'women',
  },
  {
    id: 'w5',
    name: 'Kavya',
    url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
    category: 'women',
  },

  // Men
  {
    id: 'm1',
    name: 'Rohan',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
    category: 'men',
  },
  {
    id: 'm2',
    name: 'Aarav',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
    category: 'men',
  },
  {
    id: 'm3',
    name: 'Vikram',
    url: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400&auto=format&fit=crop&q=80',
    category: 'men',
  },
  {
    id: 'm4',
    name: 'Kabir',
    url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=80',
    category: 'men',
  },
  {
    id: 'm5',
    name: 'Aditya',
    url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&auto=format&fit=crop&q=80',
    category: 'men',
  },

  // Minimal / Artistic
  {
    id: 'a1',
    name: 'Aurora Glow',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=80',
    category: 'abstract',
  },
  {
    id: 'a2',
    name: 'Neon Horizon',
    url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=400&auto=format&fit=crop&q=80',
    category: 'abstract',
  },
];

/**
 * Resizes and compresses an uploaded image file into a lightweight base64 Data URL.
 * Ensures fast loading and instant storage without requiring third-party image hosting.
 */
export async function compressAndCropImage(
  file: File,
  maxDimension: number = 320,
  quality: number = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Selected file is not an image.'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to parse image.'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate square crop from center
        const size = Math.min(width, height);
        const startX = (width - size) / 2;
        const startY = (height - size) / 2;

        const targetSize = Math.min(size, maxDimension);
        canvas.width = targetSize;
        canvas.height = targetSize;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available.'));
          return;
        }

        ctx.drawImage(
          img,
          startX,
          startY,
          size,
          size,
          0,
          0,
          targetSize,
          targetSize
        );

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
