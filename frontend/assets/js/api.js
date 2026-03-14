// api.js - Backend API helpers for ABD News frontend

const NEWSHUB_API_BASE = '/api';
const NEWSHUB_API_ORIGIN = window.location.origin;


async function apiGet(path, params = {}) {
    const fullUrl = `${NEWSHUB_API_BASE}${path}`;
    const url = new URL(fullUrl, NEWSHUB_API_ORIGIN);
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            url.searchParams.set(key, value);
        }
    });

    // Build headers
    const headers = {
        'Accept': 'application/json'
    };
    
    // Add auth token if available
    if (typeof getAccessToken === 'function') {
        const token = getAccessToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
    }

    const response = await fetch(url.toString(), {
        headers: headers
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API ${response.status}: ${errorText}`);
    }

    return response.json();
}

function resolveMediaUrl(url) {
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('/')) return `${NEWSHUB_API_ORIGIN}${url}`;
    return `${NEWSHUB_API_ORIGIN}/${url}`;
}

function formatDate(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function timeAgo(isoString) {
    if (!isoString) return '';
    const now = new Date();
    const date = new Date(isoString);
    const diffMs = now - date;
    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} min${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
}

function getQueryParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

// CMS API Functions
async function fetchSiteSettings() {
    try {
        return await apiGet('/site-settings/');
    } catch (error) {
        console.error('Failed to fetch site settings:', error);
        return null;
    }
}

async function fetchSocialLinks() {
    try {
        const data = await apiGet('/social-links/');
        return data.results || data || [];
    } catch (error) {
        console.error('Failed to fetch social links:', error);
        return [];
    }
}

async function fetchFooterSettings() {
    try {
        return await apiGet('/footer/');
    } catch (error) {
        console.error('Failed to fetch footer settings:', error);
        return null;
    }
}

async function fetchSidebarWidgets() {
    try {
        const data = await apiGet('/sidebar/');
        return data.results || data || [];
    } catch (error) {
        console.error('Failed to fetch sidebar widgets:', error);
        return [];
    }
}

async function fetchHomepageSections(sectionType = null) {
    try {
        const params = sectionType ? { section_type: sectionType } : {};
        const data = await apiGet('/homepage/', params);
        return data.results || data || [];
    } catch (error) {
        console.error('Failed to fetch homepage sections:', error);
        return [];
    }
}

async function fetchAdvertisements(position = null) {
    try {
        const params = position ? { position: position } : {};
        const data = await apiGet('/ads/', params);
        return data.results || data || [];
    } catch (error) {
        console.error('Failed to fetch advertisements:', error);
        return [];
    }
}

async function fetchSEOSettings() {
    try {
        return await apiGet('/seo/');
    } catch (error) {
        console.error('Failed to fetch SEO settings:', error);
        return null;
    }
}

// News API Functions
async function fetchBreakingNews() {
    try {
        const data = await apiGet('/news/breaking-news/');
        return data.results || data || [];
    } catch (error) {
        console.error('Failed to fetch breaking news:', error);
        return [];
    }
}

async function fetchCategories() {
    try {
        const data = await apiGet('/news/categories/');
        return data.results || data || [];
    } catch (error) {
        console.error('Failed to fetch categories:', error);
        return [];
    }
}

async function fetchArticles(params = {}) {
    try {
        const data = await apiGet('/news/articles/', params);
        return data;
    } catch (error) {
        console.error('Failed to fetch articles:', error);
        return { results: [], count: 0 };
    }
}

async function fetchArticleBySlug(slug) {
    try {
        const data = await apiGet(`/news/articles/${slug}/`);
        return data;
    } catch (error) {
        console.error('Failed to fetch article:', error);
        throw error;
    }
}

async function fetchVideos(params = {}) {
    try {
        const data = await apiGet('/news/videos/', params);
        return data;
    } catch (error) {
        console.error('Failed to fetch videos:', error);
        return { results: [], count: 0 };
    }
}

// Cache for CMS data
const cmsCache = {
    siteSettings: null,
    socialLinks: null,
    footerSettings: null,
    sidebarWidgets: null,
    advertisements: {},
    seoSettings: null,
    categories: null,
    lastUpdate: null
};

async function loadCMSData(forceRefresh = false) {
    const cacheTimeout = 5 * 60 * 1000; // 5 minutes
    const now = Date.now();
    
    if (!forceRefresh && cmsCache.lastUpdate && (now - cmsCache.lastUpdate < cacheTimeout)) {
        return cmsCache;
    }

    try {
        const [siteSettings, socialLinks, footerSettings, sidebarWidgets, seoSettings, categories] = await Promise.all([
            fetchSiteSettings(),
            fetchSocialLinks(),
            fetchFooterSettings(),
            fetchSidebarWidgets(),
            fetchSEOSettings(),
            fetchCategories()
        ]);

        cmsCache.siteSettings = siteSettings;
        cmsCache.socialLinks = socialLinks;
        cmsCache.footerSettings = footerSettings;
        cmsCache.sidebarWidgets = sidebarWidgets;
        cmsCache.seoSettings = seoSettings;
        cmsCache.categories = categories;
        cmsCache.lastUpdate = now;

        return cmsCache;
    } catch (error) {
        console.error('Failed to load CMS data:', error);
        return cmsCache;
    }
}
