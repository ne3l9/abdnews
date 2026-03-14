// app.js - Dynamic data rendering for ABD News frontend

// Update authentication buttons in header
function updateAuthButtons() {
    const authButtonsContainer = document.getElementById('authButtons');
    if (!authButtonsContainer) return;
    
    const isAuth = typeof isAuthenticated === 'function' && isAuthenticated();
    const currentUser = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
    
    if (isAuth && currentUser) {
        const isAdmin = currentUser.is_staff || currentUser.is_superuser;
        authButtonsContainer.innerHTML = `
            <a href="/pages/dashboard.html" style="color: var(--dark-gray); text-decoration: none; font-weight: 500; margin-right: 15px;">
                <i class="fas fa-user"></i> ${currentUser.username}
            </a>
            ${isAdmin ? `
            <a href="/pages/admin-categories.html" style="color: var(--primary-color); text-decoration: none; font-weight: 500; margin-right: 15px;">
                <i class="fas fa-cog"></i> Manage Categories
            </a>
            ` : ''}
            <button onclick="logout()" style="background: var(--toi-red); color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 600;">
                Logout
            </button>
        `;
    } else {
        authButtonsContainer.innerHTML = `
            <a href="/pages/login.html" style="color: var(--dark-gray); text-decoration: none; font-weight: 600; padding: 8px 16px;">
                Login
            </a>
            <a href="/pages/signup.html" style="background: var(--toi-red); color: white; text-decoration: none; padding: 8px 16px; border-radius: 6px; font-weight: 600;">
                Sign Up
            </a>
        `;
    }
}

function waitForElement(selector, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const start = Date.now();
        const timer = setInterval(() => {
            const el = document.querySelector(selector);
            if (el) {
                clearInterval(timer);
                resolve(el);
            } else if (Date.now() - start > timeout) {
                clearInterval(timer);
                reject(new Error(`Timeout waiting for ${selector}`));
            }
        }, 100);
    });
}

function buildArticleLink(slug) {
    return `/pages/article.html?slug=${encodeURIComponent(slug)}`;
}

// Header Rendering
function renderHeader(siteSettings, categories) {
    // Update logo and site name
    const logoDiv = document.querySelector('.logo');
    if (logoDiv && siteSettings) {
        // Use static logo image
        const logoIcon = `<a href="/index.html"><img src="/assets/images/logo/logo.png" alt="ABD News Logo" style="height: 40px; object-fit: contain;"></a>`;
        
        logoDiv.innerHTML = logoIcon;
    }

    // Update primary navigation links with correct hrefs
    const primaryNavLinks = document.querySelectorAll('header nav ul li a');
    if (primaryNavLinks.length > 0) {
        const navItems = [
            { href: '/index.html', icon: 'fas fa-home', text: 'Home' },
            { href: '/pages/trending.html', icon: 'fas fa-fire', text: 'Trending' },
            { href: '/pages/editorial.html', icon: 'fas fa-pen-fancy', text: 'Editorial' },
            { href: '/pages/videos.html', icon: 'fab fa-youtube', text: 'Videos' },
            { href: '/pages/contact.html', icon: 'fas fa-capsules', text: 'News Capsule' }
        ];
        
        primaryNavLinks.forEach((link, index) => {
            if (navItems[index]) {
                link.href = navItems[index].href;
                link.innerHTML = `<i class="${navItems[index].icon}"></i> ${navItems[index].text}`;
            }
        });
    }
    
    // Add auth buttons to header
    const headerContainer = document.querySelector('.header-container');
    if (headerContainer) {
        // Check if auth buttons already exist
        let authButtons = headerContainer.querySelector('.auth-buttons');
        
        // Check auth state
        const isAuth = typeof isAuthenticated === 'function' && isAuthenticated();
        const currentUser = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
        
        // Create auth buttons HTML based on login state
        let authButtonsHTML = '';
        if (isAuth && currentUser) {
            authButtonsHTML = `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <a href="/pages/dashboard.html" style="color: var(--dark-gray); text-decoration: none; font-weight: 500;">
                        <i class="fas fa-user"></i> ${currentUser.username}
                    </a>
                    <button onclick="logout()" style="background: var(--toi-red); color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 600;">
                        Logout
                    </button>
                </div>
            `;
        } else {
            authButtonsHTML = `
                <a href="/pages/login.html" style="color: var(--dark-gray); text-decoration: none; font-weight: 600; padding: 8px 16px;">
                    Login
                </a>
                <a href="/pages/signup.html" style="background: var(--toi-red); color: white; text-decoration: none; padding: 8px 16px; border-radius: 6px; font-weight: 600;">
                    Sign Up
                </a>
            `;
        }
        
        // Update or create auth buttons
        if (!authButtons) {
            authButtons = document.createElement('div');
            authButtons.className = 'auth-buttons';
            authButtons.style.cssText = 'display: flex; gap: 10px; align-items: center; margin-left: auto;';
            
            // Insert before search bar
            const searchBar = headerContainer.querySelector('.search-bar');
            if (searchBar) {
                headerContainer.insertBefore(authButtons, searchBar);
            } else {
                headerContainer.appendChild(authButtons);
            }
        }
        
        // Always update the content
        authButtons.innerHTML = authButtonsHTML;
    }

    // Update secondary navigation with categories from API
    const secondaryNavLinks = document.querySelector('.secondary-nav-links');
    if (secondaryNavLinks && categories && categories.length) {
        const topCategories = categories.slice(0, 11);
        secondaryNavLinks.innerHTML = topCategories.map(cat => 
            `<li><a href="/pages/trending.html?category=${encodeURIComponent(cat.slug)}">${cat.name}</a></li>`
        ).join('');
    }

    // Update date and time in edition bar
    const dateTimeElement = document.querySelector('.date-time');
    if (dateTimeElement) {
        const now = new Date();
        const options = { 
            weekday: 'short', 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        };
        const formattedDate = now.toLocaleString('en-US', options).replace(',', '');
        dateTimeElement.textContent = formattedDate + ' IST';
    }

    // Update favicon if provided
    if (siteSettings && siteSettings.favicon_url) {
        let favicon = document.querySelector('link[rel="icon"]');
        if (!favicon) {
            favicon = document.createElement('link');
            favicon.rel = 'icon';
            document.head.appendChild(favicon);
        }
        favicon.href = siteSettings.favicon_url;
    }
}

// Footer Rendering
function renderFooter(footerSettings, socialLinks) {
    // Update social links only
    const socialLinksContainer = document.querySelector('footer .social-links');
    if (socialLinksContainer && socialLinks && socialLinks.length) {
        socialLinksContainer.innerHTML = socialLinks.map(link => 
            `<a href="${link.url}" target="_blank" rel="noopener noreferrer" aria-label="${link.platform_display}">
                <i class="${link.icon}"></i>
            </a>`
        ).join('');
    }

    // Update copyright text only
    const copyrightElement = document.querySelector('footer .copyright p');
    if (copyrightElement && footerSettings && footerSettings.copyright_text) {
        copyrightElement.innerHTML = footerSettings.copyright_text;
    }
    
    // Update Quick Links if extra_links is provided
    if (footerSettings && footerSettings.extra_links) {
        try {
            const links = typeof footerSettings.extra_links === 'string' 
                ? JSON.parse(footerSettings.extra_links)
                : footerSettings.extra_links;
            
            if (Array.isArray(links) && links.length) {
                const quickLinksColumn = document.querySelector('.footer-column:nth-child(2) .footer-links');
                if (quickLinksColumn) {
                    quickLinksColumn.innerHTML = links.map(link => 
                        `<li><a href="${link.url}"><i class="fas fa-chevron-right"></i> ${link.label}</a></li>`
                    ).join('');
                }
            }
        } catch (e) {
            console.warn('Failed to parse extra_links:', e);
        }
    }
}

// Sidebar Rendering
function renderSidebar(widgets, ads) {
    const categoryList = document.querySelector('.left-sidebar .category-list');
    if (!categoryList) return;

    let sidebarHTML = '';

    // Add widgets first
    if (widgets && widgets.length) {
        widgets.forEach(widget => {
            sidebarHTML += `
                <li class="widget-item">
                    <div class="widget-content">
                        ${widget.html_content}
                    </div>
                </li>
            `;
        });
    }

    // Add sidebar ads
    if (ads && ads.length) {
        ads.forEach(ad => {
            const adImage = ad.image_url 
                ? `<img src="${ad.image_url}" alt="${ad.title}" class="ad-image" style="width: 100%; height: auto; border-radius: 4px;">`
                : '';
            sidebarHTML += `
                <li class="ad-item" style="margin: 10px 0;">
                    <a href="${ad.link_url}" target="_blank" rel="noopener noreferrer" style="display: block; text-decoration: none;">
                        ${adImage}
                        <div class="ad-title" style="margin-top: 5px; font-size: 13px; color: var(--dark-gray);">${ad.title}</div>
                    </a>
                </li>
            `;
        });
    }

    // Prepend widgets and ads to the existing category list
    if (sidebarHTML) {
        const existingContent = categoryList.innerHTML;
        categoryList.innerHTML = sidebarHTML + existingContent;
    }
}

// Breaking News Rendering
function renderBreakingNews(items) {
    const container = document.querySelector('.breaking-news-content');
    if (!container) return;

    if (!items.length) {
        container.innerHTML = '<span class="breaking-news-text">No breaking news at the moment.</span>';
        return;
    }

    container.innerHTML = items.map(item => {
        return `<span class="breaking-news-text">${item.text}</span>`;
    }).join('');
}

async function loadBreakingNews() {
    try {
        await waitForElement('.breaking-news-content');
        const items = await fetchBreakingNews();
        renderBreakingNews(items);
    } catch (error) {
        console.warn('Breaking news load failed:', error.message);
    }
}

function renderCategorySidebar(categories) {
    const list = document.querySelector('.left-sidebar .category-list');
    if (!list) return;

    // Store existing widgets/ads that were prepended
    const existingWidgets = list.querySelectorAll('.widget-item, .ad-item');
    let widgetsHTML = '';
    existingWidgets.forEach(item => {
        widgetsHTML += item.outerHTML;
    });

    // Generate category items
    const categoryItems = categories.map(cat => {
        const iconClass = cat.icon || 'fas fa-folder';
        return `
            <li>
                <a href="/pages/trending.html?category=${encodeURIComponent(cat.slug)}">
                    <i class="${iconClass}"></i> ${cat.name}
                </a>
            </li>
        `;
    }).join('');

    // Combine widgets and categories
    list.innerHTML = widgetsHTML + categoryItems;
}

// Homepage Sections Rendering
function renderHomepageSections(sections) {
    const container = document.querySelector('.homepage-sections');
    if (!container) return;

    if (!sections || !sections.length) {
        console.warn('No homepage sections to render');
        return;
    }

    // Sort by position
    const sortedSections = [...sections].sort((a, b) => a.position - b.position);

    container.innerHTML = sortedSections.map(section => {
        const articles = section.section_articles || [];
        
        if (section.section_type === 'hero' && articles.length > 0) {
            return renderHeroSection(articles[0]);
        } else if (section.section_type === 'featured' && articles.length > 0) {
            return renderFeaturedSection(section, articles);
        } else if (section.section_type === 'list' && articles.length > 0) {
            return renderListSection(section, articles);
        } else if (section.section_type === 'grid' && articles.length > 0) {
            return renderGridSection(section, articles);
        }
        return '';
    }).join('');
}

function renderHeroSection(article) {
    return `
        <section class="hero-section">
            <div class="main-article">
                <img src="${resolveMediaUrl(article.featured_image) || 'https://images.unsplash.com/photo-1588681664899-f142ff2dc9b1?auto=format&fit=crop&w=1200&q=80'}" alt="${article.title}">
                <div class="article-overlay">
                    <div class="article-content">
                        <h1 class="article-title">${article.title}</h1>
                        <div class="article-meta">
                            <span><i class="far fa-clock"></i> ${timeAgo(article.published_at)}</span>
                            <span><i class="far fa-eye"></i> ${article.views_count.toLocaleString()} views</span>
                            <span><i class="far fa-comment"></i> ${article.comment_count || 0} comments</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    `;
}

function renderFeaturedSection(section, articles) {
    return `
        <section class="featured-section">
            <h2 class="section-title">${section.title}</h2>
            <div class="trending-grid">
                ${articles.map(article => `
                    <div class="trending-item">
                        <img src="${resolveMediaUrl(article.featured_image) || 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=600&q=80'}" alt="${article.title}">
                        <div class="trending-content">
                            <h3>${article.title}</h3>
                            <p>${article.summary || ''}</p>
                            <a href="${buildArticleLink(article.slug)}" class="read-more">Read More <i class="fas fa-arrow-right"></i></a>
                        </div>
                    </div>
                `).join('')}
            </div>
        </section>
    `;
}

function renderListSection(section, articles) {
    return `
        <section class="list-section">
            <h2 class="section-title">${section.title}</h2>
            <div class="news-list">
                ${articles.map(article => `
                    <div class="news-thumbnail">
                        <div class="thumbnail-img">
                            <a href="${buildArticleLink(article.slug)}">
                                <img src="${resolveMediaUrl(article.featured_image) || 'https://images.unsplash.com/photo-1586227740560-8cf2732c1531?auto=format&fit=crop&w=200&q=80'}" alt="${article.title}">
                            </a>
                        </div>
                        <div class="thumbnail-content">
                            <h4><a href="${buildArticleLink(article.slug)}">${article.title}</a></h4>
                            <p><i class="far fa-clock"></i> ${timeAgo(article.published_at)}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
        </section>
    `;
}

function renderGridSection(section, articles) {
    return `
        <section class="grid-section">
            <h2 class="section-title">${section.title}</h2>
            <div class="article-grid">
                ${articles.map(article => `
                    <article class="article-card">
                        <div class="article-image">
                            <img src="${resolveMediaUrl(article.featured_image) || 'https://images.unsplash.com/photo-1588681664899-f142ff2dc9b1?auto=format&fit=crop&w=600&q=80'}" alt="${article.title}">
                        </div>
                        <div class="article-body">
                            <div class="article-category">${article.category_name || ''}</div>
                            <h3>${article.title}</h3>
                            <p class="article-excerpt">${article.summary || ''}</p>
                            <div class="article-footer">
                                <div class="article-author">
                                    <i class="fas fa-user-circle"></i> ${article.author_name || 'ABD News'}
                                </div>
                                <div class="article-stats">
                                    <span><i class="far fa-eye"></i> ${article.views_count?.toLocaleString() || 0}</span>
                                    <span><i class="far fa-comment"></i> ${article.comment_count || 0}</span>
                                </div>
                            </div>
                        </div>
                    </article>
                `).join('')}
            </div>
        </section>
    `;
}

// SEO Meta Tags Rendering
function renderSEO(seoSettings) {
    if (!seoSettings) return;

    document.title = seoSettings.meta_title || 'ABD News - Latest News';
    
    // Meta description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.name = 'description';
        document.head.appendChild(metaDesc);
    }
    metaDesc.content = seoSettings.meta_description || '';

    // Meta keywords
    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (!metaKeywords) {
        metaKeywords = document.createElement('meta');
        metaKeywords.name = 'keywords';
        document.head.appendChild(metaKeywords);
    }
    metaKeywords.content = seoSettings.meta_keywords || '';

    // Open Graph tags
    setMetaTag('og:title', seoSettings.og_title || seoSettings.meta_title);
    setMetaTag('og:description', seoSettings.og_description || seoSettings.meta_description);
    setMetaTag('og:image', seoSettings.og_image_url || '');
    setMetaTag('og:type', 'website');
    setMetaTag('og:url', window.location.href);

    // Twitter Card tags
    setMetaTag('twitter:card', 'summary_large_image', 'name');
    setMetaTag('twitter:title', seoSettings.og_title || seoSettings.meta_title, 'name');
    setMetaTag('twitter:description', seoSettings.og_description || seoSettings.meta_description, 'name');
    setMetaTag('twitter:image', seoSettings.og_image_url || '', 'name');
}

function setMetaTag(property, content, attributeName = 'property') {
    if (!content) return;
    
    let tag = document.querySelector(`meta[${attributeName}="${property}"]`);
    if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute(attributeName, property);
        document.head.appendChild(tag);
    }
    tag.content = content;
}

// Advertisement Rendering
function renderAds(ads, position) {
    const containers = document.querySelectorAll(`.ad-container[data-position="${position}"]`);
    if (!containers.length) return;

    const positionAds = ads.filter(ad => ad.position === position && ad.is_active);
    
    containers.forEach(container => {
        if (positionAds.length > 0) {
            const ad = positionAds[0]; // Show first active ad
            const imageUrl = ad.image_url || (ad.image ? resolveMediaUrl(ad.image) : null);
            
            if (imageUrl) {
                container.innerHTML = `
                    <div class="advertisement" style="width: 100%; height: 100%;">
                        <a href="${ad.link_url || '#'}" target="_blank" rel="noopener noreferrer" style="display: block; width: 100%; height: 100%;">
                            <img src="${imageUrl}" alt="${ad.title}" style="width: 100%; height: auto; display: block; border-radius: 12px;" />
                        </a>
                    </div>
                `;
            } else {
                container.innerHTML = `
                    <div class="advertisement" style="padding: 40px; text-align: center; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); border-radius: 12px;">
                        <h3 style="font-size: 24px; color: #555; margin: 0 0 10px 0;">${ad.title}</h3>
                        <a href="${ad.link_url || '#'}" target="_blank" style="display: inline-block; padding: 12px 24px; background: var(--toi-red); color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">Learn More</a>
                    </div>
                `;
            }
            
            // Track impression
            if (ad.id) {
                // TODO: Add impression tracking API call
                console.log(`Ad impression: ${ad.title}`);
            }
        } else {
            // Show placeholder if no ads available
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #999;">
                    <i class="fas fa-ad" style="font-size: 48px; margin-bottom: 15px; opacity: 0.3;"></i>
                    <p style="font-size: 16px;">Advertisement Space Available</p>
                </div>
            `;
        }
    });
}

function renderMainArticle(article) {
    const mainArticle = document.querySelector('.main-article');
    if (!mainArticle) return;

    const image = mainArticle.querySelector('img');
    const title = mainArticle.querySelector('.article-title');
    const metaSpans = mainArticle.querySelectorAll('.article-meta span');
    const overlay = mainArticle.querySelector('.article-overlay');

    if (image) image.src = resolveMediaUrl(article.featured_image) || 'https://images.unsplash.com/photo-1588681664899-f142ff2dc9b1?auto=format&fit=crop&w=1200&q=80';
    if (title) title.textContent = article.title;

    if (metaSpans.length >= 3) {
        metaSpans[0].innerHTML = `<i class="far fa-clock"></i> ${timeAgo(article.published_at)}`;
        metaSpans[1].innerHTML = `<i class="far fa-eye"></i> ${article.views_count.toLocaleString()} views`;
        metaSpans[2].innerHTML = `<i class="far fa-comment"></i> ${article.comment_count || 0} comments`;
    }

    if (overlay) {
        overlay.style.cursor = 'pointer';
        overlay.addEventListener('click', () => {
            window.location.href = buildArticleLink(article.slug);
        });
    }
}

function renderTrendingGrid(articles) {
    const grid = document.querySelector('.trending-grid');
    if (!grid) return;

    if (!articles.length) {
        grid.innerHTML = '<p>No trending articles found.</p>';
        return;
    }

    grid.innerHTML = articles.map(article => {
        return `
            <div class="trending-item">
                <img src="${resolveMediaUrl(article.featured_image) || 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=600&q=80'}" alt="${article.title}">
                <div class="trending-content">
                    <h3>${article.title}</h3>
                    <p>${article.summary || ''}</p>
                    <a href="${buildArticleLink(article.slug)}" class="read-more">Read More <i class="fas fa-arrow-right"></i></a>
                </div>
            </div>
        `;
    }).join('');
}

function renderRightSidebar(articles) {
    const sidebar = document.querySelector('.right-sidebar');
    if (!sidebar) return;

    const items = articles.map(article => {
        const link = buildArticleLink(article.slug);
        return `
            <div class="news-thumbnail">
                <div class="thumbnail-img">
                    <a href="${link}">
                        <img src="${resolveMediaUrl(article.featured_image) || 'https://images.unsplash.com/photo-1586227740560-8cf2732c1531?auto=format&fit=crop&w=200&q=80'}" alt="${article.title}">
                    </a>
                </div>
                <div class="thumbnail-content">
                    <h4><a href="${link}">${article.title}</a></h4>
                    <p><i class="far fa-clock"></i> ${timeAgo(article.published_at)}</p>
                </div>
            </div>
        `;
    }).join('');

    sidebar.innerHTML = `
        <div class="category-title">Latest</div>
        ${items}
    `;
}

// Main Page Loaders
async function loadHomePage() {
    try {
        showLoading();

        // Load CMS data
        const cmsData = await loadCMSData();
        
        // Render header, footer, sidebar
        renderHeader(cmsData.siteSettings, cmsData.categories);
        renderFooter(cmsData.footerSettings, cmsData.socialLinks);
        renderSEO(cmsData.seoSettings);

        // Load homepage sections and articles
        const [sections, ads, articlesData, trendingData] = await Promise.all([
            fetchHomepageSections(),
            fetchAdvertisements(),
            fetchArticles({ ordering: '-published_at', page_size: 10 }),
            fetchArticles({ ordering: '-views_count', page_size: 8 })
        ]);

        // Render sidebar widgets and ads
        const sidebarAds = ads.filter(ad => ad.position === 'sidebar');
        renderSidebar(cmsData.sidebarWidgets, sidebarAds);

        // Render main categories in sidebar
        renderCategorySidebar(cmsData.categories);

        const latestArticles = articlesData.results || [];
        const trendingArticles = trendingData.results || [];

        // Render homepage sections
        if (sections && sections.length) {
            renderHomepageSections(sections);
        } else if (latestArticles.length > 0) {
            // Fallback: render default layout with articles
            renderDefaultHomepage(latestArticles, trendingArticles);
        } else {
            // No data at all - show placeholder
            renderPlaceholderContent();
        }

        // Load and render featured videos
        loadFeaturedVideosCarousel();

        // Render ads in various positions
        renderAds(ads, 'header');
        renderAds(ads, 'homepage');
        renderAds(ads, 'content');
        renderAds(ads, 'footer');

        hideLoading();
    } catch (error) {
        console.error('Home page load failed:', error);
        showError('Failed to load page content. Please refresh.');
        hideLoading();
    }
}

// Default homepage layout when no sections configured
function renderDefaultHomepage(latestArticles, trendingArticles) {
    const container = document.querySelector('.homepage-sections');
    if (!container) return;

    const heroArticle = latestArticles[0];
    const remainingArticles = latestArticles.slice(1, 5);
    const trending = trendingArticles.slice(0, 4);

    container.innerHTML = `
        <section class="hero-section" style="margin-bottom: 30px;">
            <div class="main-article" style="position: relative; height: 500px; border-radius: 8px; overflow: hidden; cursor: pointer;" onclick="window.location.href='${buildArticleLink(heroArticle.slug)}'">
                <img src="${resolveMediaUrl(heroArticle.featured_image) || 'https://images.unsplash.com/photo-1588681664899-f142ff2dc9b1?auto=format&fit=crop&w=1200&q=80'}" alt="${heroArticle.title}" style="width: 100%; height: 100%; object-fit: cover;">
                <div class="article-overlay" style="position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.8), transparent); display: flex; align-items: flex-end; padding: 40px;">
                    <div class="article-content">
                        <span class="article-tag" style="background: var(--toi-red); color: white; padding: 5px 12px; border-radius: 3px; font-size: 12px; font-weight: 600; margin-bottom: 10px; display: inline-block;">FEATURED</span>
                        <h1 class="article-title" style="color: white; font-size: 32px; font-weight: 700; margin: 10px 0; line-height: 1.3;">${heroArticle.title}</h1>
                        <div class="article-meta" style="color: rgba(255,255,255,0.9); display: flex; gap: 20px; font-size: 14px;">
                            <span><i class="far fa-clock"></i> ${timeAgo(heroArticle.published_at)}</span>
                            <span><i class="far fa-eye"></i> ${heroArticle.views_count?.toLocaleString() || 0} views</span>
                            <span><i class="far fa-comment"></i> ${heroArticle.comment_count || 0} comments</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <section class="trending-articles" style="margin-bottom: 30px;">
            <div class="section-title" style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px;">
                <i class="fas fa-fire" style="color: var(--toi-red); font-size: 24px;"></i>
                <h2 style="font-size: 26px; font-weight: 700; color: var(--dark-gray);">Trending Now</h2>
            </div>
            <div class="trending-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px;">
                ${trending.map(article => `
                    <div class="trending-item" style="background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); cursor: pointer; transition: transform 0.3s;" onclick="window.location.href='${buildArticleLink(article.slug)}'">
                        <img src="${resolveMediaUrl(article.featured_image) || 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=600&q=80'}" alt="${article.title}" style="width: 100%; height: 200px; object-fit: cover;">
                        <div class="trending-content" style="padding: 20px;">
                            <h3 style="font-size: 18px; font-weight: 600; margin-bottom: 10px; color: var(--dark-gray);">${article.title}</h3>
                            <p style="color: var(--medium-gray); font-size: 14px; line-height: 1.5;">${article.summary || ''}</p>
                            <a href="${buildArticleLink(article.slug)}" class="read-more" style="color: var(--toi-red); font-weight: 600; margin-top: 10px; display: inline-block; text-decoration: none;">Read More <i class="fas fa-arrow-right"></i></a>
                        </div>
                    </div>
                `).join('')}
            </div>
        </section>
    `;
}

// Placeholder content when no data available
function renderPlaceholderContent() {
    const container = document.querySelector('.homepage-sections');
    if (!container) return;

    container.innerHTML = `
        <div style="text-align: center; padding: 60px 20px;">
            <i class="fas fa-newspaper" style="font-size: 64px; color: var(--medium-gray); margin-bottom: 20px;"></i>
            <h2 style="font-size: 24px; color: var(--dark-gray); margin-bottom: 10px;">Welcome to ABD News</h2>
            <p style="color: var(--medium-gray); font-size: 16px; max-width: 600px; margin: 0 auto;">
                No content available yet. Please add articles in the admin panel to see them here.
            </p>
            <a href="/admin/" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background: var(--toi-red); color: white; text-decoration: none; border-radius: 4px; font-weight: 600;">
                Go to Admin Panel
            </a>
        </div>
    `;
}

function renderTrendingPage(articles) {
    const grid = document.querySelector('.trending-articles-grid');
    if (!grid) return;

    if (!articles.length) {
        grid.innerHTML = '<p>No articles found.</p>';
        return;
    }

    grid.innerHTML = articles.map((article, index) => {
        return `
            <article class="article-card" onclick="window.location.href='${buildArticleLink(article.slug)}'">
                <div class="article-image">
                    <img src="${resolveMediaUrl(article.featured_image) || 'https://images.unsplash.com/photo-1588681664899-f142ff2dc9b1?auto=format&fit=crop&w=600&q=80'}" alt="${article.title}">
                    <span class="trending-badge">
                        <i class="fas fa-fire"></i> Trending #${index + 1}
                    </span>
                </div>
                <div class="article-body">
                    <div class="article-category">${article.category_name || ''}</div>
                    <h3>${article.title}</h3>
                    <p class="article-excerpt">${article.summary || ''}</p>
                    <div class="article-footer">
                        <div class="article-author">
                            <i class="fas fa-user-circle"></i> ${article.author_name || 'NewsHub'}
                        </div>
                        <div class="article-stats">
                            <span><i class="far fa-eye"></i> ${article.views_count?.toLocaleString() || 0}</span>
                            <span><i class="far fa-comment"></i> ${article.comment_count || 0}</span>
                        </div>
                    </div>
                </div>
            </article>
        `;
    }).join('');
}

async function loadTrendingPage(selectedCategory = null) {
    try {
        showLoading();

        // Load CMS data
        const cmsData = await loadCMSData();
        renderHeader(cmsData.siteSettings, cmsData.categories);
        renderFooter(cmsData.footerSettings, cmsData.socialLinks);
        renderSEO(cmsData.seoSettings);

        const categorySlug = selectedCategory || getQueryParam('category');
        const searchQuery = getQueryParam('q');

        let data;
        if (searchQuery) {
            data = await apiGet('/news/search/', { q: searchQuery, page_size: 12 });
        } else if (categorySlug) {
            data = await fetchArticles({ category: categorySlug, ordering: '-views_count', page_size: 12 });
        } else {
            data = await fetchArticles({ ordering: '-views_count', page_size: 12 });
        }

        const articles = data.results || data || [];
        renderTrendingPage(articles);
        hideLoading();
    } catch (error) {
        console.error('Trending page load failed:', error);
        showError('Failed to load trending articles.');
        hideLoading();
    }
}

function initTrendingFilters() {
    const buttons = document.querySelectorAll('.filter-btn');
    if (!buttons.length) return;

    buttons.forEach(btn => {
        btn.addEventListener('click', async () => {
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const label = btn.textContent.trim();
            if (label.toLowerCase() === 'all') {
                await loadTrendingPage(null);
                return;
            }

            const slug = label.toLowerCase().replace(/\s+/g, '-');
            await loadTrendingPage(slug);
        });
    });
}

function renderCategoriesPage(categories) {
    const grid = document.querySelector('.categories-grid');
    if (!grid) return;

    const fallbackIcons = ['fas fa-globe', 'fas fa-briefcase', 'fas fa-microchip', 'fas fa-futbol', 'fas fa-film', 'fas fa-flask', 'fas fa-heartbeat', 'fas fa-landmark', 'fas fa-leaf'];

    grid.innerHTML = categories.map((cat, index) => {
        const iconClass = cat.icon || fallbackIcons[index % fallbackIcons.length];
        return `
            <div class="category-card" data-slug="${cat.slug}">
                <div class="category-image">
                    <i class="${iconClass} category-icon"></i>
                    <div class="category-bg-pattern"></div>
                </div>
                <div class="category-content">
                    <h2>${cat.name}</h2>
                    <p class="category-count">${cat.article_count || 0} Articles</p>
                    <p class="category-description">${cat.description || 'Explore the latest stories and updates.'}</p>
                    <button class="explore-btn">Explore <i class="fas fa-arrow-right"></i></button>
                </div>
            </div>
        `;
    }).join('');

    grid.querySelectorAll('.category-card, .explore-btn').forEach(el => {
        el.addEventListener('click', (event) => {
            const card = event.currentTarget.closest('.category-card');
            if (!card) return;
            const slug = card.getAttribute('data-slug');
            window.location.href = `/pages/trending.html?category=${encodeURIComponent(slug)}`;
        });
    });
}

async function loadCategoriesPage() {
    try {
        showLoading();

        const cmsData = await loadCMSData();
        renderHeader(cmsData.siteSettings, cmsData.categories);
        renderFooter(cmsData.footerSettings, cmsData.socialLinks);
        renderSEO(cmsData.seoSettings);

        const categories = await fetchCategories();
        renderCategoriesPage(categories);
        hideLoading();
    } catch (error) {
        console.error('Categories page load failed:', error);
        showError('Failed to load categories.');
        hideLoading();
    }
}

// Loading and Error States
function showLoading() {
    const loadingDiv = document.getElementById('loading-indicator');
    if (loadingDiv) {
        loadingDiv.style.display = 'flex';
    }
    document.body.classList.add('is-loading');
}

function hideLoading() {
    const loadingDiv = document.getElementById('loading-indicator');
    if (loadingDiv) {
        loadingDiv.style.display = 'none';
    }
    document.body.classList.remove('is-loading');
}

function showError(message) {
    const errorDiv = document.getElementById('error-message');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }
}

function renderEditorialPage(articles) {
    const list = document.querySelector('.editorial-list');
    if (!list) return;

    if (!articles.length) {
        list.innerHTML = '<p>No editorial articles found.</p>';
        return;
    }

    list.innerHTML = articles.map(article => {
        return `
            <article class="editorial-item">
                <div class="editorial-image">
                    <img src="${resolveMediaUrl(article.featured_image) || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=800&q=80'}" alt="${article.title}">
                </div>
                <div class="editorial-content">
                    <div class="editorial-meta">
                        <span class="editorial-category">${article.category_name || 'Editorial'}</span>
                        <span><i class="far fa-calendar"></i> ${formatDate(article.published_at)}</span>
                        <span><i class="far fa-clock"></i> ${article.read_time || 1} min read</span>
                    </div>
                    <h2>${article.title}</h2>
                    <p class="editorial-excerpt">${article.summary || ''}</p>
                    <div class="editorial-author">
                        <div class="author-avatar"><i class="fas fa-user"></i></div>
                        <div class="author-info">
                            <h4>${article.author_name || 'ABD News'}</h4>
                            <p>${article.author_designation || ''}</p>
                        </div>
                    </div>
                    <a href="${buildArticleLink(article.slug)}" class="read-editorial-btn">
                        Read Editorial <i class="fas fa-arrow-right"></i>
                    </a>
                </div>
            </article>
        `;
    }).join('');
}

async function loadEditorialPage() {
    try {
        const data = await apiGet('/articles/featured/', { limit: 8 });
        const articles = data.results || data || [];
        renderEditorialPage(articles);
    } catch (error) {
        console.warn('Editorial page load failed:', error.message);
    }
}

async function loadArticlePage() {
    try {
        const slug = getQueryParam('slug');
        let article;

        if (slug) {
            article = await apiGet(`/news/articles/${slug}/`);
        } else {
            const data = await apiGet('/news/articles/', { ordering: '-published_at', page_size: 1 });
            article = data.results?.[0];
        }

        if (!article) return;

        const title = document.querySelector('.article-title');
        const categoryTag = document.querySelector('.article-category-tag');
        const meta = document.querySelector('.article-meta');
        const featuredImage = document.querySelector('.featured-image img');
        const content = document.querySelector('.article-content');
        const tagsContainer = document.querySelector('.article-tags');
        const authorName = document.querySelector('.article-author-info strong');
        const authorRole = document.querySelector('.article-author-info p');

        if (title) title.textContent = article.title;
        if (categoryTag) categoryTag.textContent = article.category?.name || 'News';

        if (authorName) authorName.textContent = article.author?.full_name || article.author?.user?.username || article.author_name || 'ABD News';
        if (authorRole) authorRole.textContent = article.author?.designation || article.author_designation || '';

        if (meta) {
            meta.innerHTML = `
                <div class="article-author-info">
                    <div class="author-avatar"><i class="fas fa-user"></i></div>
                    <div>
                        <strong>${article.author?.full_name || article.author?.user?.username || article.author_name || 'ABD News'}</strong>
                        <p style="font-size: 12px; margin: 0;">${article.author?.designation || article.author_designation || ''}</p>
                    </div>
                </div>
                <span class="article-meta-item"><i class="far fa-calendar"></i> ${formatDate(article.published_at)}</span>
                <span class="article-meta-item"><i class="far fa-clock"></i> ${article.read_time || 1} min read</span>
                <span class="article-meta-item"><i class="far fa-eye"></i> ${article.views_count?.toLocaleString() || 0} views</span>
                <span class="article-meta-item"><i class="far fa-comment"></i> ${article.comment_count || 0} comments</span>
            `;
        }

        if (featuredImage) {
            featuredImage.src = resolveMediaUrl(article.featured_image) || featuredImage.src;
            featuredImage.alt = article.title;
        }

        // Check if article is preview-only (requires subscription)
        if (article.requires_subscription && article.is_preview) {
            // Show limited preview content
            if (content) {
                content.innerHTML = `
                    ${article.content || ''}
                    <div style="background: linear-gradient(to bottom, transparent, white); height: 100px; margin-top: -100px; position: relative;"></div>
                    <div style="background: #f8f9fa; border: 2px solid var(--toi-red); border-radius: 15px; padding: 40px; text-align: center; margin: 40px 0;">
                        <i class="fas fa-lock" style="font-size: 48px; color: var(--toi-red); margin-bottom: 20px;"></i>
                        <h2 style="color: var(--dark-gray); margin-bottom: 15px;">Subscribe to Continue Reading</h2>
                        <p style="color: var(--medium-gray); font-size: 16px; margin-bottom: 25px;">
                            This is a preview. Subscribe to ABD News Premium to access full articles, exclusive content, and much more.
                        </p>
                        <div style="display: flex; gap: 15px; justify-content: center;">
                            <a href="/pages/subscription.html" style="background: var(--toi-red); color: white; padding: 14px 30px; border-radius: 8px; text-decoration: none; font-weight: 600; transition: all 0.3s;">
                                View Plans
                            </a>
                            ${!isAuthenticated() ? `
                                <a href="/pages/signup.html" style="background: white; color: var(--toi-red); padding: 14px 30px; border-radius: 8px; text-decoration: none; font-weight: 600; border: 2px solid var(--toi-red); transition: all 0.3s;">
                                    Sign Up
                                </a>
                            ` : ''}
                        </div>
                    </div>
                `;
            }
        } else {
            // Show full content
            if (content) {
                content.innerHTML = article.content || '';
            }
        }

        if (tagsContainer && article.tags) {
            tagsContainer.innerHTML = article.tags.map(tag => `<span class="tag">${tag.name}</span>`).join('');
        }
    } catch (error) {
        console.warn('Article page load failed:', error.message);
    }
}

function initSearchRedirect() {
    const input = document.querySelector('.search-bar input');
    const button = document.querySelector('.search-bar button');
    if (!input || !button) return;

    const triggerSearch = () => {
        const term = input.value.trim();
        if (term) {
            window.location.href = `/pages/trending.html?q=${encodeURIComponent(term)}`;
        }
    };

    window.NEWSHUB_SEARCH_HANDLER = triggerSearch;

    button.addEventListener('click', triggerSearch);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            triggerSearch();
        }
    });
}

// Videos Page Functions
async function loadVideosPage() {
    try {
        // Load featured videos and all videos
        const [featuredData, allVideosData] = await Promise.all([
            apiGet('/news/videos/featured/', { limit: 1 }),
            apiGet('/news/videos/', { page_size: 20, is_active: 'true' })
        ]);

        const featured = featuredData.results && featuredData.results.length > 0 ? featuredData.results[0] : null;
        const allVideos = allVideosData.results || allVideosData || [];

        // Render featured video
        if (featured) {
            const featuredContainer = document.querySelector('.featured-video-player');
            if (featuredContainer) {
                const thumbnail = resolveMediaUrl(featured.featured_image) || 'https://via.placeholder.com/1200x600?text=Featured+Video';
                const parent = featuredContainer.closest('.featured-video');
                if (parent) {
                    parent.querySelector('img').src = thumbnail;
                    parent.querySelector('.featured-video-info h2').textContent = featured.title;
                    
                    const metaSpans = parent.querySelectorAll('.featured-video-meta span');
                    if (metaSpans.length >= 3) {
                        metaSpans[0].innerHTML = `<i class="fas fa-user"></i> ${featured.author_name || 'ABD News'}`;
                        metaSpans[1].innerHTML = `<i class="far fa-eye"></i> ${featured.views_count?.toLocaleString() || 0} views`;
                        metaSpans[2].innerHTML = `<i class="far fa-calendar"></i> ${formatDate(featured.published_at)}`;
                    }
                    
                    const description = parent.querySelector('.featured-video-info p');
                    if (description) {
                        description.textContent = featured.description || '';
                    }
                }
            }
        }

        // Render video grid
        renderVideoGrid(allVideos);
    } catch (error) {
        console.warn('Videos page load failed:', error.message);
    }
}

function renderVideoGrid(videos) {
    const grid = document.querySelector('.videos-grid');
    if (!grid) return;

    if (!videos.length) {
        grid.innerHTML = '<p>No videos available.</p>';
        return;
    }

    grid.innerHTML = videos.map((video, index) => {
        const thumbnail = resolveMediaUrl(video.featured_image) || resolveMediaUrl(video.thumbnail) || 'https://via.placeholder.com/400x300?text=Video';
        return `
            <div class="video-card" style="cursor: pointer;" data-video-url="${video.video_url || '#'}" onclick="if(this.dataset.videoUrl !== '#') openVideoModal(this.dataset.videoUrl)">
                <div class="video-thumbnail">
                    <img src="${thumbnail}" alt="${video.title}" loading="lazy">
                    <span class="video-duration">${video.duration || '00:00'}</span>
                    <div class="video-play-icon">
                        <i class="fas fa-play"></i>
                    </div>
                </div>
                <div class="video-body">
                    <h3>${video.title}</h3>
                    <p class="video-excerpt">${video.description?.substring(0, 100) || ''}...</p>
                    <div class="video-footer">
                        <div class="video-author">
                            <i class="fas fa-user-circle"></i> ${video.author_name || 'ABD News'}
                        </div>
                        <div class="video-stats">
                            <span><i class="far fa-eye"></i> ${video.views_count?.toLocaleString() || 0}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Homepage Featured Videos Carousel
async function loadFeaturedVideosCarousel() {
    try {
        const featuredVideosData = await apiGet('/news/videos/featured/', { limit: 10 });
        const videos = featuredVideosData.results || featuredVideosData || [];
        
        if (!videos.length) {
            console.log('No featured videos available');
            return;
        }

        renderFeaturedVideosCarousel(videos);
        initVideoCarousel();
    } catch (error) {
        console.warn('Failed to load featured videos:', error.message);
    }
}

function renderFeaturedVideosCarousel(videos) {
    const carouselTrack = document.querySelector('.featured-videos-carousel .carousel-track');
    if (!carouselTrack) return;

    carouselTrack.innerHTML = videos.map(video => {
        const thumbnail = resolveMediaUrl(video.featured_image) || resolveMediaUrl(video.thumbnail) || 'https://via.placeholder.com/400x300?text=Video';
        const videoUrl = video.video_url || '#';
        
        return `
            <div class="video-card" style="min-width: 280px; flex-shrink: 0; background: var(--white); border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); cursor: pointer; transition: transform 0.3s;" data-video-url="${videoUrl}">
                <div class="video-thumb" style="position: relative; height: 180px; overflow: hidden;">
                    <img src="${thumbnail}" alt="${video.title}" style="width: 100%; height: 100%; object-fit: cover;">
                    <div class="video-overlay" style="position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.7), transparent); display: flex; align-items: flex-end; padding: 15px;">
                        <div style="color: white;">
                            <h4 style="font-size: 14px; font-weight: 600; margin: 0; line-height: 1.3;">${video.title}</h4>
                            <div style="display: flex; align-items: center; gap: 8px; margin-top: 5px; font-size: 12px;">
                                <span><i class="far fa-clock"></i> ${video.duration || '0:00'}</span>
                                <span><i class="far fa-eye"></i> ${video.views_count?.toLocaleString() || 0}</span>
                            </div>
                        </div>
                    </div>
                    <div class="play-overlay" style="position: absolute; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; transition: opacity 0.3s;">
                        <i class="fas fa-play-circle" style="font-size: 48px; color: white;"></i>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function initVideoCarousel() {
    const track = document.querySelector('.featured-videos-carousel .carousel-track');
    const prevBtn = document.querySelector('.featured-videos-carousel .carousel-nav.prev');
    const nextBtn = document.querySelector('.featured-videos-carousel .carousel-nav.next');
    
    if (!track) return;

    const scrollAmount = 300;

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            track.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            track.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        });
    }

    // Video card click handlers
    const videoCards = track.querySelectorAll('.video-card');
    videoCards.forEach(card => {
        card.addEventListener('click', function() {
            const videoUrl = this.dataset.videoUrl;
            if (videoUrl && videoUrl !== '#') {
                // Open video in modal
                openVideoModal(videoUrl);
            }
        });
    });
}

// Video Modal Functions
function openVideoModal(videoUrl) {
    // Create modal if it doesn't exist
    let modal = document.getElementById('videoModal');
    if (!modal) {
        modal = createVideoModal();
    }

    // Convert video URL to embed format
    const embedUrl = convertToEmbedUrl(videoUrl);
    
    console.log('Opening video:', videoUrl);
    console.log('Embed URL:', embedUrl);

    // Set iframe src
    const iframe = modal.querySelector('#videoIframe');
    if (iframe) {
        iframe.src = embedUrl;
    }

    // Show modal
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeVideoModal() {
    const modal = document.getElementById('videoModal');
    if (modal) {
        const iframe = modal.querySelector('#videoIframe');
        if (iframe) {
            iframe.src = ''; // Stop video playback
        }
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

// Make functions globally accessible
window.openVideoModal = openVideoModal;
window.closeVideoModal = closeVideoModal;

// Close modal on escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeVideoModal();
    }
});

function createVideoModal() {
    const modal = document.createElement('div');
    modal.id = 'videoModal';
    modal.style.cssText = `
        display: none;
        position: fixed;
        z-index: 10000;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.95);
        align-items: center;
        justify-content: center;
        padding: 20px;
    `;

    modal.innerHTML = `
        <div style="position: relative; width: 100%; max-width: 1200px; background: #000; border-radius: 8px; padding: 10px;">
            <button id="closeVideoBtn" style="position: absolute; top: -45px; right: 0; background: var(--toi-red); border: none; color: white; font-size: 24px; cursor: pointer; z-index: 10001; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 10px rgba(0,0,0,0.3);">
                <i class="fas fa-times"></i>
            </button>
            <div style="position: relative; width: 100%; padding-bottom: 56.25%; background: #000;">
                <iframe 
                    id="videoIframe"
                    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; border-radius: 8px;" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" 
                    allowfullscreen>
                </iframe>
            </div>
        </div>
    `;

    // Close button click handler
    const closeBtn = modal.querySelector('#closeVideoBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeVideoModal();
        });
    }

    // Close on background click
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeVideoModal();
        }
    });

    document.body.appendChild(modal);
    return modal;
}

function convertToEmbedUrl(url) {
    if (!url) return '';
    
    try {
        // YouTube - regular watch URL
        if (url.includes('youtube.com/watch')) {
            const urlObj = new URL(url);
            const videoId = urlObj.searchParams.get('v');
            if (videoId) {
                return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
            }
        }
        
        // YouTube - short URL
        if (url.includes('youtu.be/')) {
            const videoId = url.split('youtu.be/')[1].split('?')[0].split('/')[0];
            if (videoId) {
                return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
            }
        }

        // YouTube - already embed URL
        if (url.includes('youtube.com/embed/')) {
            return url.includes('autoplay') ? url : url + '?autoplay=1&rel=0';
        }

        // Vimeo
        if (url.includes('vimeo.com/')) {
            const videoId = url.split('vimeo.com/')[1].split('?')[0].split('/')[0];
            if (videoId) {
                return `https://player.vimeo.com/video/${videoId}?autoplay=1`;
            }
        }

        // Dailymotion
        if (url.includes('dailymotion.com/video/')) {
            const videoId = url.split('dailymotion.com/video/')[1].split('?')[0];
            if (videoId) {
                return `https://www.dailymotion.com/embed/video/${videoId}?autoplay=1`;
            }
        }

        // If already an embed URL or unknown format, return as is
        return url;
    } catch (error) {
        console.error('Error converting video URL:', error);
        return url;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;

    initSearchRedirect();
    loadBreakingNews();

    if (path.endsWith('/index.html') || path === '/' || path.endsWith('/frontend/')) {
        loadHomePage();
    }

    if (path.includes('/trending.html')) {
        loadTrendingPage();
        initTrendingFilters();
    }

    if (path.includes('/categories.html')) {
        loadCategoriesPage();
    }

    if (path.includes('/editorial.html')) {
        loadEditorialPage();
    }

    if (path.includes('/article.html')) {
        loadArticlePage();
    }

    if (path.includes('/videos.html')) {
        loadVideosPage();
    }
});
