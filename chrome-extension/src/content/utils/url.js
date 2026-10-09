"use strict";

/**
 * Normalizes a URL string by stripping dynamic, tracking, or transient parameters
 * (e.g. YouTube playback position &t=..., standard UTM tracking parameters).
 * Keeps vital video ID or page path.
 * 
 * @param {string} urlStr - The raw URL string to normalize
 * @returns {string} - The clean, normalized URL
 */
export function getNormalizedUrl(urlStr) {
  if (!urlStr) return "";
  try {
    const url = new URL(urlStr);
    
    // YouTube video pages: keep only 'v' and discard '&t=', '&ab_channel=', '&index=', etc.
    if (url.hostname.includes('youtube.com') || url.hostname.includes('youtu.be')) {
      const v = url.searchParams.get('v');
      if (v) {
        return `https://www.youtube.com/watch?v=${v}`;
      }
    }
    
    // Strip hash/fragment
    url.hash = '';
    
    // Strip common tracking and analytics query parameters
    const trackingParams = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 
      'utm_content', 'fbclid', 'gclid', 'yclid', 'msclkid', 'dclid'
    ];
    trackingParams.forEach(param => url.searchParams.delete(param));
    
    let cleanUrl = url.toString();
    
    // Strip trailing slashes for standard page matching consistency
    if (cleanUrl.endsWith('/')) {
      cleanUrl = cleanUrl.slice(0, -1);
    }
    
    return cleanUrl;
  } catch (e) {
    console.warn("[BrSE URL Utility] Failed to parse and normalize URL:", urlStr, e);
    return urlStr;
  }
}
