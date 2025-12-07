// Convert image files to base64 data URLs
export const loadImageAsBase64 = async (imagePath: string): Promise<string> => {
  try {
    const response = await fetch(imagePath);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error loading image:', error);
    return '';
  }
};

// Load all marker icons as base64
export const loadMarkerIcons = async () => {
  const iconUrls: any = {};
  
  // These paths will be resolved by Expo/React Native bundler
  const imageRequires = {
    gold: require('../../assets/marker-icon-gold.png'),
    red: require('../../assets/marker-icon-red.png'),
    green: require('../../assets/marker-icon-green.png'),
    shadow: require('../../assets/marker-shadow.png'),
  };
  
  // Convert require() results to strings (they're already URIs on web/mobile)
  for (const [key, value] of Object.entries(imageRequires)) {
    const uri = typeof value === 'string' ? value : (value as any).default || (value as any).uri || value;
    iconUrls[key] = uri;
  }
  
  return iconUrls;
};
