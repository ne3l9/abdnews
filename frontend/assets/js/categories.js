/**
 * Category Management Module
 * Handles dynamic category loading and navigation updates
 */

const CategoryManager = {
    API_BASE: 'http://localhost:8000/api',
    categories: [],
    categoryTree: [],

    /**
     * Initialize category manager - load categories and update navigation
     */
    async init() {
        await this.loadCategories();
        this.updateNavigation();
        
        // Refresh categories every 60 seconds for real-time updates
        setInterval(() => this.refreshCategories(), 60000);
    },

    /**
     * Load categories from API
     */
    async loadCategories() {
        try {
            const response = await fetch(`${this.API_BASE}/news/categories/tree/`);
            if (!response.ok) throw new Error('Failed to load categories');
            
            this.categoryTree = await response.json();
            
            // Also load flat list for easier access
            const flatResponse = await fetch(`${this.API_BASE}/news/categories/`);
            if (flatResponse.ok) {
                this.categories = await flatResponse.json();
            }
            
            return this.categoryTree;
        } catch (error) {
            console.error('Error loading categories:', error);
            return [];
        }
    },

    /**
     * Refresh categories silently in background
     */
    async refreshCategories() {
        const previousCount = this.categories.length;
        await this.loadCategories();
        
        // Only update UI if categories changed
        if (this.categories.length !== previousCount) {
            this.updateNavigation();
            console.log('Categories updated in real-time');
        }
    },

    /**
     * Update navigation menu with categories
     */
    updateNavigation() {
        // Update secondary navigation (the main one we want to update)
        const secondaryNav = document.getElementById('dynamic-categories');
        if (secondaryNav) {
            this.renderSecondaryNav(secondaryNav);
        }

        // Update category dropdown if exists
        const categoryDropdown = document.querySelector('.category-dropdown');
        if (categoryDropdown) {
            this.renderCategoryDropdown(categoryDropdown);
        }
    },

    /**
     * Render primary navigation categories
     */
    renderPrimaryNav(container) {
        // Get first 6 main categories for primary nav
        const mainCategories = this.categoryTree.slice(0, 6);
        
        const categoryLinks = mainCategories.map(category => {
            const hasSubcategories = category.subcategories && category.subcategories.length > 0;
            
            return `
                <li class="nav-item ${hasSubcategories ? 'has-dropdown' : ''}">
                    <a href="../pages/categories.html?category=${category.slug}">
                        ${category.name}
                    </a>
                    ${hasSubcategories ? this.renderSubcategoryDropdown(category.subcategories) : ''}
                </li>
            `;
        }).join('');
        
        // Find the categories section in nav
        const existingCategories = container.querySelectorAll('.nav-item');
        existingCategories.forEach(item => {
            if (!item.classList.contains('nav-home')) {
                item.remove();
            }
        });
        
        // Add new categories after Home link
        const homeLink = container.querySelector('.nav-home');
        if (homeLink) {
            homeLink.insertAdjacentHTML('afterend', categoryLinks);
        }
    },

    /**
     * Render subcategory dropdown
     */
    renderSubcategoryDropdown(subcategories) {
        return `
            <ul class="dropdown-menu">
                ${subcategories.map(subcat => `
                    <li>
                        <a href="../pages/categories.html?category=${subcat.slug}">
                            <span class="category-color" style="background-color: ${subcat.color}"></span>
                            ${subcat.name}
                        </a>
                    </li>
                `).join('')}
            </ul>
        `;
    },

    /**
     * Render secondary navigation categories
     */
    renderSecondaryNav(container) {
        // Get all main categories for secondary nav
        const mainCategories = this.categoryTree;
        
        // Find existing TOI* link
        const existingLinks = container.querySelectorAll('li');
        const toiLink = Array.from(existingLinks).find(li => li.textContent.includes('TOI*'));
        
        // Build category links
        const categoryLinks = mainCategories.map(category => `
            <li>
                <a href="../pages/categories.html?category=${category.slug}" 
                   style="border-left: 3px solid ${category.color}; padding-left: 8px;">
                    ${category.name}
                </a>
            </li>
        `).join('');
        
        // Clear existing category links (keep TOI* link)
        container.innerHTML = '';
        
        // Add TOI* link back
        if (toiLink) {
            container.appendChild(toiLink);
        } else {
            container.innerHTML = '<li><a href="/index.html">TOI*</a></li>';
        }
        
        // Add category links
        container.insertAdjacentHTML('beforeend', categoryLinks);
    },

    /**
     * Render full category dropdown (for mobile menu or dedicated page)
     */
    renderCategoryDropdown(container) {
        const html = this.categoryTree.map(category => `
            <div class="category-group">
                <a href="../pages/categories.html?category=${category.slug}" 
                   class="category-main"
                   style="border-left: 4px solid ${category.color}">
                    ${category.name}
                    <span class="article-count">${category.article_count}</span>
                </a>
                ${category.subcategories && category.subcategories.length > 0 ? `
                    <div class="subcategory-list">
                        ${category.subcategories.map(subcat => `
                            <a href="../pages/categories.html?category=${subcat.slug}"
                               class="subcategory-item">
                                <span class="color-dot" style="background-color: ${subcat.color}"></span>
                                ${subcat.name}
                                <span class="article-count">${subcat.article_count}</span>
                            </a>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `).join('');
        
        container.innerHTML = html;
    },

    /**
     * Get category by slug
     */
    getCategoryBySlug(slug) {
        // Search in flat list first
        let category = this.categories.find(cat => cat.slug === slug);
        if (category) return category;
        
        // Search in tree structure
        for (const mainCat of this.categoryTree) {
            if (mainCat.slug === slug) return mainCat;
            
            if (mainCat.subcategories) {
                category = mainCat.subcategories.find(sub => sub.slug === slug);
                if (category) return category;
            }
        }
        
        return null;
    },

    /**
     * Get all articles for a category (including subcategories)
     */
    async getCategoryArticles(slug, includeSubcategories = true) {
        try {
            const response = await fetch(`${this.API_BASE}/news/articles/?category=${slug}`);
            if (!response.ok) throw new Error('Failed to load articles');
            
            return await response.json();
        } catch (error) {
            console.error('Error loading category articles:', error);
            return { results: [] };
        }
    },

    /**
     * Render category page
     */
    async renderCategoryPage(slug) {
        const category = this.getCategoryBySlug(slug);
        if (!category) {
            console.error('Category not found:', slug);
            return;
        }
        
        // Update page title
        document.title = `${category.name} - ABD News`;
        
        // Update page header
        const pageHeader = document.querySelector('.page-header');
        if (pageHeader) {
            pageHeader.innerHTML = `
                <h1 style="border-left: 4px solid ${category.color}; padding-left: 16px;">
                    ${category.name}
                </h1>
                ${category.description ? `<p>${category.description}</p>` : ''}
            `;
        }
        
        // Load and render articles
        const articlesData = await this.getCategoryArticles(slug);
        const articlesContainer = document.querySelector('.articles-grid');
        
        if (articlesContainer && articlesData.results) {
            if (articlesData.results.length === 0) {
                articlesContainer.innerHTML = '<p class="no-articles">No articles in this category yet.</p>';
            } else {
                articlesContainer.innerHTML = articlesData.results.map(article => `
                    <article class="article-card">
                        <a href="article.html?slug=${article.slug}">
                            <img src="${article.featured_image || '../assets/images/placeholder.jpg'}" 
                                 alt="${article.title}">
                            <div class="article-content">
                                <span class="category-badge" style="background-color: ${category.color}">
                                    ${category.name}
                                </span>
                                <h3>${article.title}</h3>
                                <p>${article.excerpt}</p>
                                <div class="article-meta">
                                    <span>${article.author_name}</span>
                                    <span>${new Date(article.published_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </a>
                    </article>
                `).join('');
            }
        }
        
        // Render subcategories if exists
        if (category.subcategories && category.subcategories.length > 0) {
            const subcatContainer = document.querySelector('.subcategories-section');
            if (subcatContainer) {
                subcatContainer.innerHTML = `
                    <h2>Subcategories</h2>
                    <div class="subcategories-grid">
                        ${category.subcategories.map(subcat => `
                            <a href="categories.html?category=${subcat.slug}" 
                               class="subcategory-card"
                               style="border-top: 3px solid ${subcat.color}">
                                <h3>${subcat.name}</h3>
                                <p>${subcat.article_count} articles</p>
                            </a>
                        `).join('')}
                    </div>
                `;
            }
        }
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    CategoryManager.init();
});

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CategoryManager;
}
