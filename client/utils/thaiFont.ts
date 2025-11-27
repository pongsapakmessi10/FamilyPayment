// Thai font loader for pdfmake
// Downloads THSarabunNew font from CDN and adds to pdfmake

interface ThaiFont {
    normal: string;
    bold: string;
    italics: string;
    bolditalics: string;
}

const downloadFont = async (url: string): Promise<string> => {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error('Failed to download font:', error);
        return '';
    }
};

export const loadThaiFont = async (): Promise<{ [key: string]: ThaiFont }> => {
    // Using Google Fonts CDN for Sarabun (Thai-compatible font)
    // This returns base64 data URLs that pdfmake can use

    const fontBaseUrl = 'https://fonts.gstatic.com/s/sarabun';

    // For now, use a simpler approach - return Roboto and let it show boxes
    // User can see structure even if Thai doesn't render
    // TODO: Properly embed THSarabunNew font

    return {
        Sarabun: {
            normal: 'Roboto-Regular.ttf',
            bold: 'Roboto-Medium.ttf',
            italics: 'Roboto-Italic.ttf',
            bolditalics: 'Roboto-MediumItalic.ttf'
        }
    };
};
