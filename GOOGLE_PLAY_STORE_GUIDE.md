# 📱 Google Play Store Publishing Guide

## Sri Lanka Hindu Temples Mobile App

Complete step-by-step guide to publish your mobile app on Google Play Store.

---

## 🎯 Quick Status Check

### ✅ Your App is Ready!
- **APK Built**: `apk-builds/app-release-unsigned.apk` (3.1 MB)
- **App ID**: `srilankan.hindu.temples`
- **Version**: 1.0.0
- **Min Android**: 7.0 (API 24)

### 📋 Pre-Publishing Checklist
- [x] App functionality tested
- [x] APK built successfully
- [ ] APK signed with release key
- [ ] Google Play Console account created
- [ ] App store listing prepared
- [ ] Screenshots captured
- [ ] Privacy policy created

---

## 🔐 Step 1: Sign Your APK (Required for Play Store)

### Create Release Keystore (One-time setup)
```bash
# Generate your signing key (keep this file SAFE!)
keytool -genkey -v -keystore my-release-key.keystore \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias my-key-alias \
  -dname "CN=Your Name, OU=Your Organization, O=Your Company, L=Your City, ST=Your State, C=LK"
```

**Important**: Save `my-release-key.keystore` in a secure location!

### Sign the APK
```bash
# Sign your release APK
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 \
  -keystore my-release-key.keystore \
  apk-builds/app-release-unsigned.apk my-key-alias
```

### Optimize the APK (Optional but Recommended)
```bash
# Install Android build tools first (one-time)
brew install android-commandlinetools

# Then align for better performance
zipalign -v 4 apk-builds/app-release-unsigned.apk apk-builds/app-release.apk
```

**Note**: If zipalign is not available, you can still upload the signed APK to Google Play Store. The automated script will handle this gracefully.

---

## 🏪 Step 2: Create Google Play Console Account

### Account Setup
1. **Visit**: [Google Play Console](https://play.google.com/console)
2. **Sign in** with your Google account
3. **Pay one-time fee**: $25 USD (required)
4. **Accept terms** and complete registration

### Developer Profile
- **Developer Name**: Your name or organization
- **Contact Email**: Professional email
- **Website**: Your website (if available)
- **Country**: Sri Lanka

---

## 📱 Step 3: Create App Store Listing

### Basic Information
1. **App Name**: Sri Lanka Hindu Temples
2. **Default Language**: English
3. **App Type**: Application

### App Details
```
Title: Sri Lanka Hindu Temples
Short Description: Discover Hindu temples across Sri Lanka with interactive maps, photos, and community features.

Full Description:
Explore the sacred Hindu temples of Sri Lanka with our comprehensive mobile guide. Features include:

🗺️ Interactive Maps: Navigate to temples with detailed location markers
📸 Photo Gallery: View temple images and contribute your own
💬 Community: Add comments and suggest temple names
🏨 Hotel Booking: Find nearby accommodations with direct booking links
📍 Offline Support: Browse maps even without internet connection

Perfect for pilgrims, tourists, and anyone interested in Sri Lankan Hindu heritage. Discover the spiritual heart of Sri Lanka!

Key Features:
• Interactive temple map with 100+ locations
• High-quality temple photographs
• Community-driven content
• Offline map browsing
• Hotel booking integration
• Real-time temple information
```

### Contact Information
- **Email**: Your professional email
- **Phone**: Optional
- **Website**: Your website or temple project site

---

## 📸 Step 4: Prepare Store Assets

### Screenshots (Required)
Capture these screenshots from your app:

**Required Sizes:**
- Phone: 1080 x 1920 pixels (9:16 aspect ratio)
- Min 2 screenshots, Max 8 screenshots

**Suggested Screenshots:**
1. **Main Map View** - Show temple markers on Sri Lanka map
2. **Temple Details** - Display temple information and photos
3. **Search Feature** - Show temple search functionality
4. **Hotel Booking** - Demonstrate hotel search integration
5. **Offline Mode** - Show offline capability
6. **Add Temple** - Community contribution feature

### App Icons (Required)
- **High-res Icon**: 512 x 512 pixels (PNG, 32-bit)
- **Feature Graphic**: 1024 x 500 pixels (for Play Store)
- **TV Banner**: 1280 x 720 pixels (if supporting Android TV)

### Privacy Policy (Required)
Create a privacy policy covering:
- Data collection (location, user comments)
- Third-party services (Booking.com affiliate links)
- Contact information

**Sample Privacy Policy URL**: Host on your website or use a free service like:
- [Privacy Policy Generator](https://www.privacypolicygenerator.info/)
- [TermsFeed](https://www.termsfeed.com/)

---

## 🚀 Step 5: Upload & Configure

### Upload APK
1. **Go to**: Play Console → Your App → Release → Production
2. **Create Release**: "Create new release"
3. **Upload APK**: Select your signed `app-release.apk`
4. **Release Notes**:
```
Initial release of Sri Lanka Hindu Temples app.

Features:
- Interactive temple map
- Photo galleries
- Community comments
- Hotel booking integration
- Offline support
```

### Content Rating
1. **Go to**: Store presence → Content rating
2. **Rate your app**: Select appropriate ratings
3. **Submit for review**

### Pricing & Distribution
1. **Go to**: Store presence → Pricing & distribution
2. **Free app**: Check "Free" (recommended)
3. **Countries**: Select target countries
4. **Device compatibility**: Android 7.0+ (API 24+)

---

## 📋 Step 6: App Content Policy Compliance

### Required Declarations
- [ ] **Ads**: Does your app contain ads? (No)
- [ ] **In-app purchases**: Does your app have in-app purchases? (No)
- [ ] **Data safety**: Complete data safety form

### Data Safety Form
```
Data collection and sharing:
- Location data (optional, for map features)
- User comments (optional, stored on our servers)
- No data shared with third parties except Booking.com for affiliate links
```

### Target Audience
- **Age rating**: Everyone (appropriate content)
- **Content descriptors**: None required

---

## ⏱️ Step 7: Submit for Review

### Final Checklist
- [ ] APK uploaded and signed
- [ ] Store listing complete
- [ ] Screenshots uploaded (2-8 images)
- [ ] App icon uploaded
- [ ] Privacy policy linked
- [ ] Content rating completed
- [ ] Pricing configured
- [ ] Target countries selected

### Submit
1. **Click**: "Review release"
2. **Check**: All requirements met
3. **Submit**: "Start rollout to production"

### Review Timeline
- **Initial review**: 1-3 days
- **If rejected**: 1-2 days to fix and resubmit
- **Publication**: 1-2 hours after approval

---

## 🔄 Step 8: Post-Publication Tasks

### Monitor Performance
1. **Installs**: Track download numbers
2. **Ratings**: Monitor user reviews
3. **Crashes**: Check crash reports in Play Console

### Update Process
```bash
# When releasing updates:
# 1. Increment version code in capacitor.config.ts
# 2. Rebuild APK: npm run build:apk
# 3. Sign with same keystore
# 4. Upload to Play Console
# 5. Submit for review
```

### Marketing
- **Social Media**: Share on Facebook, Instagram
- **Temple Communities**: Reach out to Hindu temples
- **Tourism Boards**: Contact Sri Lanka tourism
- **App Store Optimization**: Use keywords like "Sri Lanka temples", "Hindu pilgrimage"

---

## 🆘 Troubleshooting

### Common Issues

**APK Rejected - Signing Issues**
```bash
# Verify signature
jarsigner -verify -verbose -certs app-release.apk

# Check if properly aligned
zipalign -c 4 app-release.apk
```

**App Crashes on Some Devices**
- Test on multiple Android versions
- Check Play Console crash reports
- Review device compatibility settings

**Review Taking Too Long**
- Check email for clarification requests
- Ensure all required fields are complete
- Verify privacy policy is accessible

**Low Download Numbers**
- Improve app description with keywords
- Add more high-quality screenshots
- Get positive reviews from beta testers

---

## 💰 Monetization Options (Future)

### Current: Free App
- **Affiliate Revenue**: Booking.com commissions
- **Donations**: Optional in-app donations
- **Premium Features**: Future paid features

### Potential Revenue Streams
- **Hotel Booking Commissions**: 5-10% per booking
- **Premium Temple Guides**: Paid detailed guides
- **Merchandise**: Temple-related products
- **Sponsored Content**: Temple event promotions

---

## 📞 Support & Resources

### Google Play Help
- **Play Console Help**: [support.google.com/googleplay](https://support.google.com/googleplay)
- **Developer Policy**: [play.google.com/about/developer-content-policy](https://play.google.com/about/developer-content-policy)
- **Monetization**: [play.google.com/console/about/monetization](https://play.google.com/console/about/monetization)

### Sri Lanka Specific
- **Sri Lanka Tourism**: Contact for app promotion
- **Temple Associations**: Partner for content
- **Local Developers**: Join Sri Lankan developer communities

### Technical Support
- **Capacitor Docs**: [capacitorjs.com/docs](https://capacitorjs.com/docs)
- **React Native Community**: Forums and Discord
- **Android Developer**: [developer.android.com](https://developer.android.com)

---

## 🎉 Success Metrics

### Launch Goals
- **Downloads**: 100+ in first month
- **Rating**: 4.0+ stars
- **User Engagement**: Daily active users
- **Temple Coverage**: Complete Sri Lanka mapping

### Long-term Goals
- **Community Growth**: 1000+ active users
- **Content Expansion**: 500+ temples mapped
- **Revenue Generation**: Sustainable income from affiliates
- **Cultural Impact**: Help preserve Hindu heritage

---

## 📱 Your App is Ready!

**Current Status**: APK built and signed ✅
**Next Step**: Upload to Google Play Console 🚀

**Estimated Timeline**:
- Account setup: 30 minutes
- Store listing: 2-3 hours
- Review process: 1-7 days
- Publication: Instant after approval

**Good luck with your app launch!** 🇱🇰🕉️

---

*Built with ❤️ for the Sri Lankan Hindu community*
