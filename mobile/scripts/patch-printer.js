const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '../node_modules/@vardrz/react-native-bluetooth-escpos-printer/android/build.gradle');

if (fs.existsSync(target)) {
  let content = fs.readFileSync(target, 'utf8');
  
  if (content.includes('jcenter.bintray.com') || content.includes('repo.spring.io')) {
    // Replace buildscript repositories blocks
    content = content.replace(
      /(maven|jcenter)\s*\{\s*url\s*["']https:\/\/jcenter\.bintray\.com\/?["']\s*\}/g,
      'google()'
    );
    content = content.replace(
      /maven\s*\{\s*url\s*["']https:\/\/repo\.spring\.io\/plugins-release\/?["']\s*\}/g,
      'mavenCentral()'
    );
    // Remove extra maven google URLs
    content = content.replace(
      /maven\s*\{\s*url\s*['"]https:\/\/maven\.google\.com['"]\s*\}/g,
      ''
    );
    fs.writeFileSync(target, content, 'utf8');
    console.log('Successfully patched react-native-bluetooth-escpos-printer build.gradle repositories');
  }
} else {
  console.log('Printer module build.gradle not found to patch');
}
