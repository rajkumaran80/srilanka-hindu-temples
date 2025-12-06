// API Configuration
export const API_BASE_URL = 'http://192.168.1.159:8080';

// Sri Lanka districts for selection
export const sriLankaDistricts = [
  'Ampara', 'Anuradhapura', 'Badulla', 'Batticaloa', 'Colombo', 'Galle', 'Gampaha',
  'Hambantota', 'Jaffna', 'Kalutara', 'Kandy', 'Kegalle', 'Kilinochchi', 'Kurunegala',
  'Mannar', 'Matale', 'Matara', 'Moneragala', 'Mullaitivu', 'Nuwara Eliya',
  'Polonnaruwa', 'Puttalam', 'Ratnapura', 'Trincomalee', 'Vavuniya'
];

// District center coordinates for optimization and initial markers
export const districtCenters: { [key: string]: [number, number] } = {
  'Colombo': [6.9271, 79.8612],
  'Gampaha': [7.0873, 80.0144],
  'Kalutara': [6.5854, 79.9607],
  'Kandy': [7.2906, 80.6337],
  'Matale': [7.4675, 80.6234],
  'Nuwara Eliya': [6.9497, 80.7891],
  'Galle': [6.0535, 80.2200],
  'Matara': [5.9485, 80.5353],
  'Hambantota': [6.1246, 81.1185],
  'Jaffna': [9.6615, 80.0255],
  'Kilinochchi': [9.3803, 80.3770],
  'Mannar': [8.9810, 79.9044],
  'Mullaitivu': [9.2671, 80.8142],
  'Vavuniya': [8.7514, 80.4971],
  'Trincomalee': [8.5874, 81.2152],
  'Batticaloa': [7.7300, 81.6780],
  'Ampara': [7.2975, 81.6780],
  'Badulla': [6.9894, 81.0550],
  'Moneragala': [6.8906, 81.3454],
  'Ratnapura': [6.7056, 80.3847],
  'Kegalle': [7.2513, 80.3464],
  'Kurunegala': [7.4863, 80.3647],
  'Puttalam': [8.0362, 79.8266],
  'Anuradhapura': [8.3114, 80.4037],
  'Polonnaruwa': [7.9403, 81.0188]
};

// ORS API Configuration
export const ORS_API_KEY = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjE2ZjdkYjkyZmRjNzRlMWRhOTNkNDg3ODJhZDE1NmFiIiwiaCI6Im11cm11cjY0In0=';
export const ORS_API_URL = 'https://api.openrouteservice.org/v2/directions/driving-car';

// Sri Lanka center coordinates
export const SRI_LANKA_CENTER: [number, number] = [7.8731, 80.7718];

// Temple levels configuration
export const MIN_ZOOM_FOR_BOUNDS_LOADING = 7;
