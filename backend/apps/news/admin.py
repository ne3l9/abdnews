from django.contrib import admin
from django.utils.html import format_html
from django.utils import timezone
from .models import Category, Tag, Article, Comment, BreakingNews, NewsletterSubscriber, Video


class CommentInline(admin.TabularInline):
	model = Comment
	extra = 0
	readonly_fields = ['user', 'content', 'created_at', 'is_approved']
	can_delete = True
	fields = ['user', 'content', 'is_approved', 'created_at']
	max_num = 10


class CategoryAdmin(admin.ModelAdmin):
	list_display = ['name', 'get_parent', 'slug', 'get_article_count', 'color_preview', 'is_active', 'order', 'created_at']
	list_filter = ['is_active', 'parent', 'created_at']
	search_fields = ['name', 'description', 'slug']
	prepopulated_fields = {'slug': ('name',)}
	readonly_fields = ['article_count', 'created_at', 'updated_at', 'get_subcategories', 'icon_preview']
	list_editable = ['is_active', 'order']
	list_per_page = 50
	ordering = ['order', 'name']
	actions = ['activate_categories', 'deactivate_categories', 'move_to_top']
	
	fieldsets = (
		('Basic Information', {
			'fields': ('name', 'slug', 'parent')
		}),
		('Visual Design', {
			'fields': ('icon', 'icon_preview', 'color')
		}),
		('Settings', {
			'fields': ('is_active', 'order', 'description')
		}),
		('Statistics & Relations', {
			'fields': ('article_count', 'get_subcategories', 'created_at', 'updated_at'),
			'classes': ('collapse',)
		}),
	)

	def get_parent(self, obj):
		"""Display parent category name with link"""
		if obj.parent:
			return format_html(
				'<a href="/admin/news/category/{}/change/">{}</a>',
				obj.parent.id,
				obj.parent.name
			)
		return format_html('<span style="color:#999;">— Main Category —</span>')
	get_parent.short_description = 'Parent Category'

	def get_article_count(self, obj):
		"""Return article count with colored styling for quick scanning."""
		count = obj.article_count
		if count > 10:
			color = '#10b981'
			icon = '📈'
		elif 5 <= count <= 10:
			color = '#f59e0b'
			icon = '📊'
		else:
			color = '#ef4444'
			icon = '📉'
		return format_html(
			'<span style="color:{}; font-weight:600;">{} {}</span>',
			color, icon, count
		)
	get_article_count.short_description = 'Articles'

	def color_preview(self, obj):
		"""Display color preview swatch with hex code"""
		return format_html(
			'<div style="display:flex;align-items:center;gap:8px;">'
			'<div style="width:24px;height:24px;background-color:{};border:2px solid #e5e7eb;border-radius:4px;"></div>'
			'<code style="font-size:11px;">{}</code>'
			'</div>',
			obj.color, obj.color
		)
	color_preview.short_description = 'Color'

	def icon_preview(self, obj):
		"""Display icon preview"""
		if obj.icon:
			return format_html(
				'<img src="{}" style="max-width:100px;max-height:100px;border-radius:4px;border:1px solid #e5e7eb;" />',
				obj.icon.url
			)
		return format_html('<span style="color:#999;">No icon uploaded</span>')
	icon_preview.short_description = 'Icon Preview'

	def get_subcategories(self, obj):
		"""Display list of subcategories"""
		subcats = obj.subcategories.all().order_by('order', 'name')
		if not subcats:
			return format_html('<span style="color:#999;">No subcategories</span>')
		
		links = []
		for subcat in subcats:
			status = '✓' if subcat.is_active else '✗'
			color = '#10b981' if subcat.is_active else '#ef4444'
			links.append(
				'<a href="/admin/news/category/{}/change/" style="color:{};">{} {}</a>'.format(
					subcat.id, color, status, subcat.name
				)
			)
		return format_html(' • '.join(links))
	get_subcategories.short_description = 'Subcategories'

	def get_queryset(self, request):
		"""Optimize queryset with select_related"""
		qs = super().get_queryset(request)
		return qs.select_related('parent').prefetch_related('subcategories')

	# Admin actions
	def activate_categories(self, request, queryset):
		"""Activate selected categories"""
		updated = queryset.update(is_active=True)
		self.message_user(request, f'{updated} category(ies) activated successfully.')
	activate_categories.short_description = 'Activate selected categories'

	def deactivate_categories(self, request, queryset):
		"""Deactivate selected categories"""
		updated = queryset.update(is_active=False)
		self.message_user(request, f'{updated} category(ies) deactivated successfully.')
	deactivate_categories.short_description = 'Deactivate selected categories'

	def move_to_top(self, request, queryset):
		"""Move selected categories to top of the list"""
		for category in queryset:
			category.order = 0
			category.save(update_fields=['order'])
		self.message_user(request, f'{queryset.count()} category(ies) moved to top.')
	move_to_top.short_description = 'Move to top of list'


class TagAdmin(admin.ModelAdmin):
	list_display = ['name', 'slug', 'get_article_count', 'created_at']
	search_fields = ['name']
	prepopulated_fields = {'slug': ('name',)}
	readonly_fields = ['created_at']

	def get_article_count(self, obj):
		"""Return total number of articles tagged with this tag."""
		return obj.articles.count()
	get_article_count.short_description = 'Articles'


class ArticleAdmin(admin.ModelAdmin):
	list_display = [
		'title', 'category', 'author', 'status', 'status_badge',
		'is_featured', 'is_breaking', 'views_count',
		'get_comment_count', 'published_at'
	]
	list_filter = [
		'status', 'category', 'is_featured', 'is_breaking',
		'author', 'created_at', 'published_at'
	]
	search_fields = ['title', 'summary', 'content']
	prepopulated_fields = {'slug': ('title',)}
	readonly_fields = [
		'views_count', 'created_at', 'updated_at',
		'featured_image_preview', 'get_read_time'
	]
	filter_horizontal = ['tags']
	list_per_page = 25
	date_hierarchy = 'published_at'
	inlines = [CommentInline]
	fieldsets = (
		('Content', {
			'fields': ('title', 'slug', 'summary', 'content')
		}),
		('Media', {
			'fields': ('featured_image', 'featured_image_preview')
		}),
		('Classification', {
			'fields': ('category', 'tags', 'author')
		}),
		('Publication', {
			'fields': ('status', 'is_featured', 'is_breaking', 'published_at')
		}),
		('Metrics', {
			'fields': ('views_count', 'get_read_time', 'created_at', 'updated_at')
		}),
	)
	actions = ['make_published', 'make_draft', 'toggle_featured', 'toggle_breaking']

	def status_badge(self, obj):
		"""Display a colored badge for publication status."""
		if obj.is_published:
			return format_html('<span style="color: green; font-weight: bold;">Published</span>')
		return format_html('<span style="color: orange; font-weight: bold;">Draft</span>')
	status_badge.short_description = 'Status'

	def featured_image_preview(self, obj):
		"""Render a preview of the featured image in admin."""
		if obj.featured_image:
			return format_html(
				'<img src="{}" width="400" style="border-radius: 5px;" />',
				obj.featured_image.url
			)
		return 'No image'
	featured_image_preview.short_description = 'Featured Image'

	def get_comment_count(self, obj):
		"""Return count of approved comments for an article."""
		return obj.get_comment_count
	get_comment_count.short_description = 'Approved Comments'

	def get_read_time(self, obj):
		"""Return estimated reading time as a human-friendly string."""
		return f"{obj.get_read_time()} min read"
	get_read_time.short_description = 'Read Time'

	def make_published(self, request, queryset):
		"""Bulk action to publish selected articles."""
		updated = queryset.update(
			status=Article.ArticleStatus.PUBLISHED,
			published_at=timezone.now()
		)
		self.message_user(request, f"{updated} article(s) marked as published.")
	make_published.short_description = 'Publish selected articles'

	def make_draft(self, request, queryset):
		"""Bulk action to move selected articles to draft."""
		updated = queryset.update(status=Article.ArticleStatus.DRAFT)
		self.message_user(request, f"{updated} article(s) moved to draft.")
	make_draft.short_description = 'Move selected articles to draft'

	def toggle_featured(self, request, queryset):
		"""Toggle featured flag for selected articles."""
		for article in queryset:
			article.is_featured = not article.is_featured
			article.save(update_fields=['is_featured'])
		self.message_user(request, "Selected articles featured flag toggled.")
	toggle_featured.short_description = 'Toggle featured status'

	def toggle_breaking(self, request, queryset):
		"""Toggle breaking flag for selected articles."""
		for article in queryset:
			article.is_breaking = not article.is_breaking
			article.save(update_fields=['is_breaking'])
		self.message_user(request, "Selected articles breaking flag toggled.")
	toggle_breaking.short_description = 'Toggle breaking status'


class CommentAdmin(admin.ModelAdmin):
	list_display = [
		'get_comment_preview', 'article', 'user', 'is_approved',
		'approval_badge', 'created_at'
	]
	list_filter = ['is_approved', 'created_at']
	search_fields = ['content', 'user__username', 'article__title']
	readonly_fields = ['created_at']
	list_per_page = 30
	actions = ['approve_comments', 'unapprove_comments']

	def get_comment_preview(self, obj):
		"""Return a short preview of comment content."""
		preview = obj.content[:50]
		return f"{preview}..." if len(obj.content) > 50 else preview
	get_comment_preview.short_description = 'Comment'

	def approval_badge(self, obj):
		"""Display a colored badge for approval status."""
		if obj.is_approved:
			return format_html('<span style="color: green; font-weight: bold;">Approved</span>')
		return format_html('<span style="color: red; font-weight: bold;">Pending</span>')
	approval_badge.short_description = 'Approval'

	def approve_comments(self, request, queryset):
		"""Bulk action to approve selected comments."""
		updated = queryset.update(is_approved=True)
		self.message_user(request, f"{updated} comment(s) approved.")
	approve_comments.short_description = 'Approve selected comments'

	def unapprove_comments(self, request, queryset):
		"""Bulk action to unapprove selected comments."""
		updated = queryset.update(is_approved=False)
		self.message_user(request, f"{updated} comment(s) unapproved.")
	unapprove_comments.short_description = 'Unapprove selected comments'


class BreakingNewsAdmin(admin.ModelAdmin):
	list_display = [
		'get_text_preview', 'urgent', 'is_active',
		'status_badge', 'get_time_display', 'created_at'
	]
	list_editable = ['is_active']
	list_display_links = ['get_text_preview']
	list_filter = ['is_active', 'urgent', 'created_at']
	search_fields = ['text']
	readonly_fields = ['created_at', 'updated_at']
	list_per_page = 20
	actions = ['activate_breaking_news', 'deactivate_breaking_news']

	def get_text_preview(self, obj):
		"""Return a short preview for breaking news text."""
		preview = obj.text[:60]
		return f"{preview}..." if len(obj.text) > 60 else preview
	get_text_preview.short_description = 'Breaking News'

	def status_badge(self, obj):
		"""Display active/inactive status badge for breaking news."""
		if obj.is_active:
			return format_html('<span style="color: green; font-weight: bold;">Active</span>')
		return format_html('<span style="color: gray; font-weight: bold;">Inactive</span>')
	status_badge.short_description = 'Status'

	def activate_breaking_news(self, request, queryset):
		"""Bulk action to activate breaking news items."""
		updated = queryset.update(is_active=True)
		self.message_user(request, f"{updated} item(s) activated.")
	activate_breaking_news.short_description = 'Activate selected breaking news'

	def deactivate_breaking_news(self, request, queryset):
		"""Bulk action to deactivate breaking news items."""
		updated = queryset.update(is_active=False)
		self.message_user(request, f"{updated} item(s) deactivated.")
	deactivate_breaking_news.short_description = 'Deactivate selected breaking news'


class NewsletterSubscriberAdmin(admin.ModelAdmin):
	list_display = [
		'email', 'is_active', 'status_badge',
		'subscribed_at', 'unsubscribed_at'
	]
	list_filter = ['is_active', 'subscribed_at']
	search_fields = ['email']
	readonly_fields = ['subscribed_at', 'unsubscribed_at']
	list_per_page = 50

	def status_badge(self, obj):
		"""Display subscription status badge."""
		if obj.is_active:
			return format_html('<span style="color: green; font-weight: bold;">Active</span>')
		return format_html('<span style="color: red; font-weight: bold;">Unsubscribed</span>')
	status_badge.short_description = 'Status'


class VideoAdmin(admin.ModelAdmin):
	list_display = ['title', 'category', 'author_display', 'views_count', 'is_featured', 'is_active', 'published_at']
	list_filter = ['is_active', 'is_featured', 'category', 'published_at']
	search_fields = ['title', 'description', 'video_url']
	readonly_fields = ['slug', 'views_count', 'published_at', 'updated_at', 'thumbnail_preview']
	
	fieldsets = (
		('Video Information', {
			'fields': ('title', 'slug', 'description', 'video_url', 'duration')
		}),
		('Media', {
			'fields': ('thumbnail', 'thumbnail_preview'),
			'classes': ('wide',)
		}),
		('Organization', {
			'fields': ('category', 'author')
		}),
		('Publishing', {
			'fields': ('is_featured', 'is_active', 'published_at', 'updated_at')
		}),
		('Statistics', {
			'fields': ('views_count',),
			'classes': ('collapse',)
		}),
	)
	
	list_per_page = 25
	date_hierarchy = 'published_at'
	actions = ['make_featured', 'remove_featured', 'make_active', 'make_inactive']
	
	def author_display(self, obj):
		"""Display author name."""
		return obj.author.get_full_name() if obj.author else 'Unassigned'
	author_display.short_description = 'Author'
	
	def thumbnail_preview(self, obj):
		"""Display thumbnail preview."""
		if obj.thumbnail:
			return format_html(
				'<img src="{}" style="max-width: 300px; max-height: 300px; border-radius: 5px;" />',
				obj.thumbnail.url
			)
		return 'No image'
	thumbnail_preview.short_description = 'Thumbnail Preview'
	
	def make_featured(self, request, queryset):
		"""Mark selected videos as featured."""
		updated = queryset.update(is_featured=True)
		self.message_user(request, f'{updated} video(s) marked as featured.')
	make_featured.short_description = 'Mark selected as featured'
	
	def remove_featured(self, request, queryset):
		"""Remove featured status from selected videos."""
		updated = queryset.update(is_featured=False)
		self.message_user(request, f'{updated} video(s) removed from featured.')
	remove_featured.short_description = 'Remove featured status'
	
	def make_active(self, request, queryset):
		"""Publish selected videos."""
		updated = queryset.update(is_active=True)
		self.message_user(request, f'{updated} video(s) activated.')
	make_active.short_description = 'Activate selected videos'
	
	def make_inactive(self, request, queryset):
		"""Unpublish selected videos."""
		updated = queryset.update(is_active=False)
		self.message_user(request, f'{updated} video(s) deactivated.')
	make_inactive.short_description = 'Deactivate selected videos'



admin.site.register(Category, CategoryAdmin)
admin.site.register(Tag, TagAdmin)
admin.site.register(Article, ArticleAdmin)
admin.site.register(Comment, CommentAdmin)
admin.site.register(BreakingNews, BreakingNewsAdmin)
admin.site.register(NewsletterSubscriber, NewsletterSubscriberAdmin)
admin.site.register(Video, VideoAdmin)

admin.site.site_header = "NewsHub CMS Administration"
admin.site.site_title = "NewsHub CMS"
admin.site.index_title = "Welcome to NewsHub Content Management System"
