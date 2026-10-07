import { IndianLanguage } from '../types/cinemaPlatform';

export const INDIAN_LANGUAGES: IndianLanguage[] = [
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
  { code: 'mr', name: 'Marathi', native: 'मराठी' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം' },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
  { code: 'or', name: 'Odia', native: 'ଓଡ଼ିଆ' },
  { code: 'as', name: 'Assamese', native: 'অসমীয়া' },
  { code: 'ur', name: 'Urdu', native: 'اردو' },
  { code: 'sa', name: 'Sanskrit', native: 'संस्कृतम्' },
  { code: 'kok', name: 'Konkani', native: 'कोंकणी' },
  { code: 'ne', name: 'Nepali', native: 'नेपाली' },
  { code: 'mni', name: 'Manipuri', native: 'মৈতৈলোন্' },
  { code: 'ks', name: 'Kashmiri', native: 'کٲشُر' },
  { code: 'sd', name: 'Sindhi', native: 'سنڌي' },
  { code: 'bho', name: 'Bhojpuri', native: 'भोजपुरी' },
  { code: 'mai', name: 'Maithili', native: 'मैथिली' },
  { code: 'en', name: 'English', native: 'English' },
];

export const getLanguageDisplay = (code: string): string => {
  const found = INDIAN_LANGUAGES.find((l) => l.code.toLowerCase() === code.toLowerCase());
  if (found) {
    return `${found.native} (${found.name})`;
  }
  return code.toUpperCase();
};
