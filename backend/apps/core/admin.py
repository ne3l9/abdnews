"""
Django Admin configurations for NewsHub Core CMS Models.

This module provides comprehensive admin interfaces for managing:
- Site-wide settings (SiteSettings, SEOSettings)
- Social media links (SocialLink)
- Advertisement banners (AdvertisementBanner)
- Footer content (FooterSettings)
- Sidebar widgets (SidebarWidget)
- Homepage sections (HomepageSection)

Features include singleton pattern enforcement, image previews, bulk actions,
JSON field editing, and M2M article selection.
"""

from django import forms
from django.contrib import admin
from django.utils.html import format_html
from django.db.models import Count
from .models import (
    SiteSettings, SocialLink, AdvertisementBanner,
    FooterSettings, SidebarWidget, HomepageSection, SEOSettings
)


class FooterSettingsForm(forms.ModelForm):
    """
    Custom form for FooterSettings with JSON editor widget for extra_links.
    Uses a larger textarea for better JSON editing experience.
    """
    extra_links = forms.CharField(
        widget=forms.Textarea(attrs={
            'rows': 12,
            'cols': 80,
            'style': 'font-family: monospace; font-size: 12px;',
            'placeholder': '[{"text": "Link Text", "url": "/url"}, ...]'
        }),
        required=False,
        help_text='Enter valid JSON array with objects containing "text" and "url" keys.'
    )
    
    class Meta:
        model = FooterSettings
        fields = '__all__'
    
    def clean_extra_links(self):
        """Validate that extra_links is valid JSON"""
        import json
        extra_links_value = self.cleaned_data.get('extra_links')
        
        if not extra_links_value:
            return []
        
        try:
            # Parse the JSON string
            if isinstance(extra_links_value, str):
                parsed = json.loads(extra_links_value)
            else:
                parsed = extra_links_value
            
            # Validate structure
            if not isinstance(parsed, list):
                raise forms.ValidationError('JSON must be an array.')
            
            for item in parsed:
                if not isinstance(item, dict) or 'text' not in item or 'url' not in item:
                    raise forms.ValidationError('Each item must have "text" and "url" keys.')
            
            return parsed
        except json.JSONDecodeError as e:
            raise forms.ValidationError(f'Invalid JSON format: {str(e)}')
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Convert list to JSON string for display in textarea
        if self.instance.extra_links and isinstance(self.instance.extra_links, list):
            import json
            self.fields['extra_links'].initial = json.dumps(
                self.instance.extra_links, indent=2
            )


class SiteSettingsAdmin(admin.ModelAdmin):
    """
    Admin interface for SiteSettings singleton model.
    
    Features:
    - Prevents deletion and duplication (singleton pattern)
    - Image previews for logo and favicon
    - Color picker preview for primary_color
    - Organized fieldsets for easy navigation
    """
    
    list_display = [
        'site_name', 'contact_email', 'logo_preview',
        'favicon_preview', 'updated_at'
    ]
    readonly_fields = [
        'site_name', 'created_at', 'updated_at', 'logo_preview',
        'favicon_preview', 'color_preview'
    ]
    fieldsets = (
        ('Branding', {
            'fields': ('site_name', 'logo', 'logo_preview', 'favicon', 'favicon_preview')
        }),
        ('Colors', {
            'fields': ('primary_color', 'color_preview')
        }),
        ('Contact', {
            'fields': ('contact_email', 'description')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def has_add_permission(self, request):
        """Prevent creating multiple instances (singleton)"""
        return not self.model.objects.exists()
    
    def has_delete_permission(self, request, obj=None):
        """Prevent deletion of singleton"""
        return False
    
    def logo_preview(self, obj):
        """Display logo preview in admin"""
        if obj.logo:
            return format_html(
                '<img src="{}" style="max-width: 200px; max-height: 100px; border-radius: 5px;" />',
                obj.logo.url
            )
        return 'No logo uploaded'
    logo_preview.short_description = 'Logo Preview'
    
    def favicon_preview(self, obj):
        """Display favicon preview in admin"""
        if obj.favicon:
            return format_html(
                '<img src="{}" style="max-width: 64px; max-height: 64px; border-radius: 3px;" />',
                obj.favicon.url
            )
        return 'No favicon uploaded'
    favicon_preview.short_description = 'Favicon Preview'
    
    def color_preview(self, obj):
        """Display color preview for primary_color"""
        return format_html(
            '<div style="width: 100px; height: 50px; background-color: {}; '
            'border: 2px solid #ccc; border-radius: 5px; display: flex; '
            'align-items: center; justify-content: center; color: white; font-weight: bold;">{}</div>',
            obj.primary_color, obj.primary_color
        )
    color_preview.short_description = 'Color Preview'


class SocialLinkAdmin(admin.ModelAdmin):
    """
    Admin interface for SocialLink model.
    
    Features:
    - Platform-based filtering and ordering
    - Clickable URL links
    - Icon preview showing FontAwesome class
    - Active/inactive status badges
    - Bulk activate/deactivate actions
    """
    
    list_display = [
        'platform', 'url_link', 'icon', 'is_active',
        'status_badge', 'order'
    ]
    list_filter = ['platform', 'is_active']
    list_editable = ['order', 'is_active']
    search_fields = ['url']
    ordering = ['order', 'platform']
    readonly_fields = ['created_at']
    
    fieldsets = (
        ('Platform Information', {
            'fields': ('platform', 'url', 'icon')
        }),
        ('Display Settings', {
            'fields': ('is_active', 'order')
        }),
        ('Timestamps', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )
    
    actions = ['activate_links', 'deactivate_links']
    
    def url_link(self, obj):
        """Display clickable URL"""
        return format_html(
            '<a href="{}" target="_blank" style="color: #0066cc; text-decoration: none;">{}</a>',
            obj.url, obj.url[:50] + '...' if len(obj.url) > 50 else obj.url
        )
    url_link.short_description = 'URL'
    
    def status_badge(self, obj):
        """Display colored active/inactive badge"""
        if obj.is_active:
            return format_html('<span style="color: green; font-weight: bold;">●</span>')
        return format_html('<span style="color: gray; font-weight: bold;">●</span>')
    status_badge.short_description = 'Status'
    
    def activate_links(self, request, queryset):
        """Bulk action to activate social links"""
        updated = queryset.update(is_active=True)
        self.message_user(request, f"{updated} social link(s) activated.")
    activate_links.short_description = 'Activate selected social links'
    
    def deactivate_links(self, request, queryset):
        """Bulk action to deactivate social links"""
        updated = queryset.update(is_active=False)
        self.message_user(request, f"{updated} social link(s) deactivated.")
    deactivate_links.short_description = 'Deactivate selected social links'


class AdvertisementBannerAdmin(admin.ModelAdmin):
    """
    Admin interface for AdvertisementBanner model.
    
    Features:
    - Position-based filtering
    - Image preview with dimensions
    - Clickable link URL display
    - CTR (Click-Through Rate) calculation display
    - Impressions and clicks tracking
    - Bulk activate/deactivate actions
    """
    
    list_display = [
        'title', 'position', 'image_preview', 'link_url_display',
        'is_active', 'status_badge', 'impressions', 'clicks',
        'ctr_display', 'order'
    ]
    list_filter = ['position', 'is_active', 'created_at']
    list_editable = ['is_active', 'order']
    search_fields = ['title', 'link_url']
    readonly_fields = [
        'impressions', 'clicks', 'ctr_display', 'image_preview',
        'created_at', 'updated_at'
    ]
    list_per_page = 20
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('title', 'position', 'order', 'is_active'),
            'description': 'Enter advertisement details. All fields marked with * are required.'
        }),
        ('Media', {
            'fields': ('image', 'image_preview'),
            'description': 'Upload an advertisement banner image (JPG, PNG, or GIF, max 5MB)'
        }),
        ('Link & Placement', {
            'fields': ('link_url',),
            'description': 'Enter the URL where users will be redirected when clicking the ad'
        }),
        ('Analytics', {
            'fields': ('impressions', 'clicks', 'ctr_display'),
            'classes': ('collapse',),
            'description': 'Automatically tracked statistics'
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    actions = ['activate_ads', 'deactivate_ads']
    
    def image_preview(self, obj):
        """Display advertisement image preview"""
        if not obj or not obj.pk:
            return format_html('<span style="color: #999;">No image</span>')
        try:
            if obj.image and hasattr(obj.image, 'url'):
                return format_html(
                    '<img src="{}" style="max-width: 300px; max-height: 200px; border-radius: 5px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />',
                    obj.image.url
                )
        except Exception:
            pass
        return format_html('<span style="color: #999;">No image uploaded</span>')
    image_preview.short_description = 'Banner Preview'
    
    def link_url_display(self, obj):
        """Display clickable advertisement URL"""
        if not obj:
            return ''
        if obj.link_url:
            return format_html(
                '<a href="{}" target="_blank" style="color: #0066cc; text-decoration: none;">{}</a>',
                obj.link_url, obj.link_url[:40] + '...' if len(obj.link_url) > 40 else obj.link_url
            )
        return format_html('<span style="color: #999;">No link</span>')
    link_url_display.short_description = 'Link URL'
    
    def status_badge(self, obj):
        """Display colored active/inactive badge"""
        if not obj:
            return ''
        if obj.is_active:
            return format_html('<span style="color: green; font-weight: bold;">✓ Active</span>')
        return format_html('<span style="color: gray; font-weight: bold;">○ Inactive</span>')
    status_badge.short_description = 'Status'
    
    def ctr_display(self, obj):
        """Display Click-Through Rate with color coding"""
        if not obj or not hasattr(obj, 'click_through_rate'):
            return '0.00%'
        try:
            ctr = obj.click_through_rate
            if ctr >= 5:
                color = 'green'
            elif ctr >= 2:
                color = 'orange'
            else:
                color = 'red'
            return format_html(
                '<span style="color: {}; font-weight: bold;">{:.2f}%</span>',
                color, ctr
            )
        except Exception:
            return '0.00%'
    ctr_display.short_description = 'CTR'
    
    def activate_ads(self, request, queryset):
        """Bulk action to activate advertisements"""
        updated = queryset.update(is_active=True)
        self.message_user(request, f"{updated} advertisement(s) activated.")
    activate_ads.short_description = 'Activate selected advertisements'
    
    def deactivate_ads(self, request, queryset):
        """Bulk action to deactivate advertisements"""
        updated = queryset.update(is_active=False)
        self.message_user(request, f"{updated} advertisement(s) deactivated.")
    deactivate_ads.short_description = 'Deactivate selected advertisements'


class FooterSettingsAdmin(admin.ModelAdmin):
    """
    Admin interface for FooterSettings singleton model.
    
    Features:
    - Singleton pattern enforcement (no add/delete)
    - JSON editor for extra_links with validation
    - Show/hide social links toggle
    - Help text showing JSON structure example
    """
    
    form = FooterSettingsForm
    list_display = ['copyright_text', 'show_social', 'updated_at']
    readonly_fields = ['created_at', 'updated_at', 'extra_links_help']
    list_per_page = 1
    
    fieldsets = (
        ('Footer Content', {
            'fields': ('copyright_text', 'about_text')
        }),
        ('Social Settings', {
            'fields': ('show_social',)
        }),
        ('Additional Links', {
            'fields': ('extra_links', 'extra_links_help'),
            'description': 'Add custom footer links as JSON array'
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def has_add_permission(self, request):
        """Prevent creating multiple instances (singleton)"""
        return not self.model.objects.exists()
    
    def has_delete_permission(self, request, obj=None):
        """Prevent deletion of singleton"""
        return False
    
    def extra_links_help(self, obj):
        """Display JSON format help text"""
        help_html = '''
        <div style="background: #f5f5f5; padding: 10px; border-radius: 5px; border-left: 4px solid #0066cc;">
            <p><strong>JSON Format Example:</strong></p>
            <pre style="overflow-x: auto;"><code>[
    {"text": "Privacy Policy", "url": "/privacy"},
    {"text": "Terms of Service", "url": "/terms"},
    {"text": "Contact Us", "url": "/contact"}
]</code></pre>
            <p style="font-size: 12px; color: #666;">Each link object must have "text" and "url" keys.</p>
        </div>
        '''
        return format_html(help_html)
    extra_links_help.short_description = 'JSON Structure Guide'


class SidebarWidgetAdmin(admin.ModelAdmin):
    """
    Admin interface for SidebarWidget model.
    
    Features:
    - Position-based ordering
    - Content preview (HTML support)
    - Active/inactive status
    - Bulk reordering capability
    """
    
    list_display = [
        'title', 'content_preview', 'position', 'is_active',
        'status_badge', 'updated_at'
    ]
    list_filter = ['is_active', 'created_at']
    list_editable = ['position', 'is_active']
    search_fields = ['title', 'content']
    ordering = ['position']
    readonly_fields = ['created_at', 'updated_at']
    list_per_page = 20
    
    fieldsets = (
        ('Widget Information', {
            'fields': ('title', 'position')
        }),
        ('Content', {
            'fields': ('content',)
        }),
        ('Settings', {
            'fields': ('is_active',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    actions = ['activate_widgets', 'deactivate_widgets']
    
    def content_preview(self, obj):
        """Display truncated HTML content preview"""
        preview = obj.content[:60]
        if len(obj.content) > 60:
            preview += '...'
        return format_html('<em>{}</em>', preview)
    content_preview.short_description = 'Content Preview'
    
    def status_badge(self, obj):
        """Display colored active/inactive badge"""
        if obj.is_active:
            return format_html('<span style="color: green; font-weight: bold;">Active</span>')
        return format_html('<span style="color: gray; font-weight: bold;">Inactive</span>')
    status_badge.short_description = 'Status'
    
    def activate_widgets(self, request, queryset):
        """Bulk action to activate widgets"""
        updated = queryset.update(is_active=True)
        self.message_user(request, f"{updated} widget(s) activated.")
    activate_widgets.short_description = 'Activate selected widgets'
    
    def deactivate_widgets(self, request, queryset):
        """Bulk action to deactivate widgets"""
        updated = queryset.update(is_active=False)
        self.message_user(request, f"{updated} widget(s) deactivated.")
    deactivate_widgets.short_description = 'Deactivate selected widgets'


class HomepageSectionAdmin(admin.ModelAdmin):
    """
    Admin interface for HomepageSection model.
    
    Features:
    - Section type filtering (hero/featured/trending/etc)
    - M2M article selection with filter_horizontal
    - Image preview for section background
    - Active/inactive status
    - Position-based ordering
    - Article count display
    """
    
    list_display = [
        'title', 'section_type', 'position', 'article_count_display',
        'is_active', 'status_badge', 'max_articles'
    ]
    list_filter = ['section_type', 'is_active', 'created_at']
    list_editable = ['position', 'is_active']
    search_fields = ['title', 'subtitle']
    filter_horizontal = ['articles']
    readonly_fields = [
        'article_count_display', 'image_preview',
        'created_at', 'updated_at'
    ]
    list_per_page = 20
    
    fieldsets = (
        ('Section Information', {
            'fields': ('section_type', 'title', 'subtitle', 'position')
        }),
        ('Media', {
            'fields': ('image', 'image_preview')
        }),
        ('Articles', {
            'fields': ('articles', 'max_articles', 'article_count_display')
        }),
        ('Display Settings', {
            'fields': ('is_active',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    actions = ['activate_sections', 'deactivate_sections']
    
    def article_count_display(self, obj):
        """Display article count with color coding"""
        count = obj.articles.count()
        if count >= obj.max_articles:
            color = 'green'
        elif count > 0:
            color = 'orange'
        else:
            color = 'red'
        return format_html(
            '<span style="color: {}; font-weight: bold;">{} / {}</span>',
            color, count, obj.max_articles
        )
    article_count_display.short_description = 'Articles Selected'
    
    def image_preview(self, obj):
        """Display section background image preview"""
        if obj.image:
            return format_html(
                '<img src="{}" style="max-width: 400px; max-height: 250px; border-radius: 5px;" />',
                obj.image.url
            )
        return 'No image'
    image_preview.short_description = 'Background Image'
    
    def status_badge(self, obj):
        """Display colored active/inactive badge"""
        if obj.is_active:
            return format_html('<span style="color: green; font-weight: bold;">Active</span>')
        return format_html('<span style="color: gray; font-weight: bold;">Inactive</span>')
    status_badge.short_description = 'Status'
    
    def activate_sections(self, request, queryset):
        """Bulk action to activate sections"""
        updated = queryset.update(is_active=True)
        self.message_user(request, f"{updated} section(s) activated.")
    activate_sections.short_description = 'Activate selected sections'
    
    def deactivate_sections(self, request, queryset):
        """Bulk action to deactivate sections"""
        updated = queryset.update(is_active=False)
        self.message_user(request, f"{updated} section(s) deactivated.")
    deactivate_sections.short_description = 'Deactivate selected sections'


class SEOSettingsAdmin(admin.ModelAdmin):
    """
    Admin interface for SEOSettings singleton model.
    
    Features:
    - Singleton pattern enforcement (no add/delete)
    - Character count validation display with color coding
    - OG image preview
    - Google Analytics and Search Console integration
    - SEO best practices hints
    """
    
    list_display = [
        'default_title', 'title_length', 'description_length', 'updated_at'
    ]
    readonly_fields = [
        'created_at', 'updated_at', 'og_image_preview',
        'title_length', 'description_length'
    ]
    list_per_page = 1
    
    fieldsets = (
        ('Default Meta Tags', {
            'fields': ('default_title', 'title_length', 'default_description', 'description_length', 'keywords')
        }),
        ('Social Sharing', {
            'fields': ('og_image', 'og_image_preview')
        }),
        ('Analytics & Verification', {
            'fields': ('google_analytics_id', 'google_site_verification'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def has_add_permission(self, request):
        """Prevent creating multiple instances (singleton)"""
        return not self.model.objects.exists()
    
    def has_delete_permission(self, request, obj=None):
        """Prevent deletion of singleton"""
        return False
    
    def og_image_preview(self, obj):
        """Display OG image preview"""
        if obj.og_image:
            return format_html(
                '<img src="{}" style="max-width: 300px; max-height: 300px; border-radius: 5px;" />',
                obj.og_image.url
            )
        return 'No image'
    og_image_preview.short_description = 'Open Graph Image'
    
    def title_length(self, obj):
        """Display title length with color coding for SEO"""
        length = len(obj.default_title)
        optimal = 60
        
        if length <= optimal:
            color = 'green'
            status = 'Good'
        elif length <= 70:
            color = 'orange'
            status = 'Acceptable'
        else:
            color = 'red'
            status = 'Too Long'
        
        return format_html(
            '<span style="color: {}; font-weight: bold;">{} / {} chars ({})</span>',
            color, length, optimal, status
        )
    title_length.short_description = 'Title Length'
    
    def description_length(self, obj):
        """Display description length with color coding for SEO"""
        length = len(obj.default_description)
        optimal = 160
        
        if length <= optimal:
            color = 'green'
            status = 'Good'
        elif length <= 180:
            color = 'orange'
            status = 'Acceptable'
        else:
            color = 'red'
            status = 'Too Long'
        
        return format_html(
            '<span style="color: {}; font-weight: bold;">{} / {} chars ({})</span>',
            color, length, optimal, status
        )
    description_length.short_description = 'Description Length'


# Register all admin classes
admin.site.register(SiteSettings, SiteSettingsAdmin)
admin.site.register(SocialLink, SocialLinkAdmin)
admin.site.register(AdvertisementBanner, AdvertisementBannerAdmin)
admin.site.register(FooterSettings, FooterSettingsAdmin)
admin.site.register(SidebarWidget, SidebarWidgetAdmin)
admin.site.register(HomepageSection, HomepageSectionAdmin)
admin.site.register(SEOSettings, SEOSettingsAdmin)
