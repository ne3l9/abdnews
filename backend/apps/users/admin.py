from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from django.utils import timezone
from .models import CustomUser, Author, SubscriptionPlan, UserSubscription


class AuthorInline(admin.StackedInline):
	"""Inline admin for Author profile within CustomUser"""
	model = Author
	extra = 0
	fields = ['bio', 'designation', 'profile_image', 'twitter_url', 'linkedin_url', 'facebook_url', 'website_url', 'is_featured']
	can_delete = True


class UserSubscriptionInline(admin.TabularInline):
	"""Inline admin for UserSubscription"""
	model = UserSubscription
	extra = 0
	readonly_fields = ['status', 'start_date', 'end_date', 'created_at']
	fields = ['plan', 'status', 'start_date', 'end_date', 'auto_renew', 'payment_reference']
	can_delete = True


class CustomUserAdmin(BaseUserAdmin):
	"""
	Enhanced user admin with role management and subscription tracking.
	"""
	
	list_display = [
		'username', 'email', 'get_full_name', 'get_role_badge', 
		'get_subscription_status', 'is_staff', 'date_joined'
	]
	list_filter = ['role', 'is_subscribed', 'is_staff', 'is_active', 'date_joined']
	search_fields = ['username', 'email', 'first_name', 'last_name']
	ordering = ['-date_joined']
	
	fieldsets = (
		('Account Information', {
			'fields': ('username', 'email', 'password')
		}),
		('Personal Information', {
			'fields': ('first_name', 'last_name', 'phone_number')
		}),
		('Role & Permissions', {
			'fields': ('role', 'is_staff', 'is_superuser', 'groups', 'user_permissions'),
		}),
		('Subscription', {
			'fields': ('is_subscribed', 'subscription_start', 'subscription_end', 'email_notifications', 'newsletter_subscription'),
			'classes': ('collapse',)
		}),
		('Dates', {
			'fields': ('last_login', 'date_joined'),
			'classes': ('collapse',)
		}),
	)
	
	add_fieldsets = (
		(None, {
			'classes': ('wide',),
			'fields': ('username', 'email', 'password1', 'password2', 'role'),
		}),
		('Permissions', {
			'classes': ('wide',),
			'fields': ('is_staff', 'is_superuser'),
		}),
	)
	
	inlines = [AuthorInline, UserSubscriptionInline]
	
	def get_full_name(self, obj):
		"""Display user's full name"""
		full_name = obj.get_full_name()
		return full_name if full_name else format_html('<span style="color:#999;">—</span>')
	get_full_name.short_description = 'Full Name'
	
	def get_role_badge(self, obj):
		"""Display role with color coding"""
		role_colors = {
			'admin': '#ef4444',
			'editor': '#f59e0b',
			'journalist': '#3b82f6',
			'subscriber': '#10b981',
		}
		color = role_colors.get(obj.role, '#6b7280')
		return format_html(
			'<span style="background-color:{}; color:white; padding:4px 8px; border-radius:4px; font-weight:600;">{}</span>',
			color, obj.get_role_display()
		)
	get_role_badge.short_description = 'Role'
	
	def get_subscription_status(self, obj):
		"""Display subscription status with icon"""
		if obj.has_active_subscription:
			remaining = (obj.subscription_end - timezone.now()).days if obj.subscription_end else 0
			return format_html(
				'<span style="color:#10b981;">✓ Active</span> <small style="color:#6b7280;">({} days left)</small>',
				remaining
			)
		elif obj.is_subscribed:
			return format_html('<span style="color:#ef4444;">✗ Expired</span>')
		else:
			return format_html('<span style="color:#6b7280;">—</span>')
	get_subscription_status.short_description = 'Subscription'
	
	def get_queryset(self, request):
		"""Optimize queryset"""
		qs = super().get_queryset(request)
		return qs.select_related('author_profile')
	
	# Admin actions
	def make_admin(self, request, queryset):
		"""Change selected users to Admin role"""
		updated = queryset.update(role=CustomUser.UserRole.ADMIN, is_staff=True)
		self.message_user(request, f'{updated} user(s) promoted to Admin.')
	make_admin.short_description = 'Change role to Admin'
	
	def make_editor(self, request, queryset):
		"""Change selected users to Editor role"""
		updated = queryset.update(role=CustomUser.UserRole.EDITOR, is_staff=True)
		self.message_user(request, f'{updated} user(s) changed to Editor.')
	make_editor.short_description = 'Change role to Editor'
	
	def make_journalist(self, request, queryset):
		"""Change selected users to Journalist role"""
		updated = queryset.update(role=CustomUser.UserRole.JOURNALIST, is_staff=False)
		self.message_user(request, f'{updated} user(s) changed to Journalist.')
	make_journalist.short_description = 'Change role to Journalist'
	
	def make_subscriber(self, request, queryset):
		"""Change selected users to Subscriber role"""
		updated = queryset.update(role=CustomUser.UserRole.SUBSCRIBER, is_staff=False)
		self.message_user(request, f'{updated} user(s) changed to Subscriber.')
	make_subscriber.short_description = 'Change role to Subscriber'
	
	def activate_users(self, request, queryset):
		"""Activate selected users"""
		updated = queryset.update(is_active=True)
		self.message_user(request, f'{updated} user(s) activated.')
	activate_users.short_description = 'Activate selected users'
	
	def deactivate_users(self, request, queryset):
		"""Deactivate selected users"""
		updated = queryset.update(is_active=False)
		self.message_user(request, f'{updated} user(s) deactivated.')
	deactivate_users.short_description = 'Deactivate selected users'
	
	actions = ['make_admin', 'make_editor', 'make_journalist', 'make_subscriber', 'activate_users', 'deactivate_users']


class AuthorAdmin(admin.ModelAdmin):
	"""
	Admin for Author profiles.
	"""
	
	list_display = ['get_author_name', 'designation', 'get_user_role', 'is_featured', 'article_count', 'created_at']
	list_filter = ['is_featured', 'created_at', 'user__role']
	search_fields = ['user__username', 'user__first_name', 'user__last_name', 'designation', 'bio']
	readonly_fields = ['article_count', 'created_at', 'updated_at', 'profile_image_preview']
	
	fieldsets = (
		('User Reference', {
			'fields': ('user',)
		}),
		('Profile Information', {
			'fields': ('designation', 'bio')
		}),
		('Profile Image', {
			'fields': ('profile_image', 'profile_image_preview'),
			'classes': ('collapse',)
		}),
		('Social Links', {
			'fields': ('twitter_url', 'linkedin_url', 'facebook_url', 'website_url'),
			'classes': ('collapse',)
		}),
		('Publishing Stats', {
			'fields': ('article_count', 'is_featured'),
			'classes': ('collapse',)
		}),
		('Dates', {
			'fields': ('created_at', 'updated_at'),
			'classes': ('collapse',)
		}),
	)
	
	def get_author_name(self, obj):
		"""Display author name with link to user"""
		user = obj.user
		return format_html(
			'<a href="/admin/users/customuser/{}/change/">{}</a>',
			user.id,
			user.get_full_name() or user.username
		)
	get_author_name.short_description = 'Author Name'
	
	def get_user_role(self, obj):
		"""Display user role"""
		role_colors = {
			'admin': '#ef4444',
			'editor': '#f59e0b',
			'journalist': '#3b82f6',
			'subscriber': '#10b981',
		}
		user = obj.user
		color = role_colors.get(user.role, '#6b7280')
		return format_html(
			'<span style="background-color:{}; color:white; padding:4px 8px; border-radius:4px; font-weight:600;">{}</span>',
			color, user.get_role_display()
		)
	get_user_role.short_description = 'Role'
	
	def profile_image_preview(self, obj):
		"""Display profile image preview"""
		if obj.profile_image:
			return format_html(
				'<img src="{}" style="max-width:200px; max-height:200px; border-radius:4px; border:1px solid #e5e7eb;" />',
				obj.profile_image.url
			)
		return format_html('<span style="color:#999;">No image uploaded</span>')
	profile_image_preview.short_description = 'Current Image'
	
	def get_queryset(self, request):
		"""Optimize queryset"""
		qs = super().get_queryset(request)
		return qs.select_related('user')
	
	actions = ['feature_authors', 'unfeature_authors']
	
	def feature_authors(self, request, queryset):
		"""Make selected authors featured"""
		updated = queryset.update(is_featured=True)
		self.message_user(request, f'{updated} author(s) featured.')
	feature_authors.short_description = 'Mark as featured'
	
	def unfeature_authors(self, request, queryset):
		"""Remove featured status from selected authors"""
		updated = queryset.update(is_featured=False)
		self.message_user(request, f'{updated} author(s) unfeatured.')
	unfeature_authors.short_description = 'Remove from featured'


class SubscriptionPlanAdmin(admin.ModelAdmin):
	"""
	Admin for Subscription Plans.
	"""
	
	list_display = ['name', 'get_plan_type_badge', 'get_price_display', 'duration_days', 'is_active', 'created_at']
	list_filter = ['plan_type', 'is_active', 'created_at']
	search_fields = ['name', 'description']
	readonly_fields = ['created_at', 'updated_at', 'get_plan_type_badge', 'get_price_display']
	
	fieldsets = (
		('Plan Details', {
			'fields': ('name', 'plan_type', 'description')
		}),
		('Pricing & Duration', {
			'fields': ('price', 'duration_days')
		}),
		('Features', {
			'fields': ('includes_email_notifications', 'includes_newsletter'),
		}),
		('Advanced Features (JSON)', {
			'fields': ('features',),
			'classes': ('collapse',)
		}),
		('Status', {
			'fields': ('is_active',)
		}),
		('Dates', {
			'fields': ('created_at', 'updated_at'),
			'classes': ('collapse',)
		}),
	)
	
	def get_plan_type_badge(self, obj):
		"""Display plan type with color coding"""
		colors = {
			'free': '#6b7280',
			'monthly': '#3b82f6',
			'quarterly': '#f59e0b',
			'yearly': '#10b981',
		}
		color = colors.get(obj.plan_type, '#6b7280')
		return format_html(
			'<span style="background-color:{}; color:white; padding:4px 8px; border-radius:4px; font-weight:600;">{}</span>',
			color, obj.get_plan_type_display()
		)
	get_plan_type_badge.short_description = 'Plan Type'
	
	def get_price_display(self, obj):
		"""Display price with currency"""
		return f'${obj.price:.2f}'
	get_price_display.short_description = 'Price'
	
	actions = ['activate_plans', 'deactivate_plans']
	
	def activate_plans(self, request, queryset):
		"""Activate selected plans"""
		updated = queryset.update(is_active=True)
		self.message_user(request, f'{updated} plan(s) activated.')
	activate_plans.short_description = 'Activate selected plans'
	
	def deactivate_plans(self, request, queryset):
		"""Deactivate selected plans"""
		updated = queryset.update(is_active=False)
		self.message_user(request, f'{updated} plan(s) deactivated.')
	deactivate_plans.short_description = 'Deactivate selected plans'


class UserSubscriptionAdmin(admin.ModelAdmin):
	"""
	Admin for User Subscriptions.
	"""
	
	list_display = ['get_user_display', 'get_plan_display', 'get_status_badge', 'start_date', 'end_date', 'auto_renew', 'created_at']
	list_filter = ['status', 'auto_renew', 'start_date', 'created_at', 'plan']
	search_fields = ['user__username', 'user__email', 'plan__name', 'payment_reference']
	readonly_fields = ['created_at', 'updated_at']
	date_hierarchy = 'created_at'
	
	fieldsets = (
		('Subscription Details', {
			'fields': ('user', 'plan', 'status')
		}),
		('Dates', {
			'fields': ('start_date', 'end_date')
		}),
		('Renewal & Payment', {
			'fields': ('auto_renew', 'payment_reference')
		}),
		('System Info', {
			'fields': ('created_at', 'updated_at'),
			'classes': ('collapse',)
		}),
	)
	
	def get_user_display(self, obj):
		"""Display user with link"""
		return format_html(
			'<a href="/admin/users/customuser/{}/change/">{}</a>',
			obj.user.id,
			obj.user.username
		)
	get_user_display.short_description = 'User'
	
	def get_plan_display(self, obj):
		"""Display plan name"""
		if obj.plan:
			return format_html(
				'<a href="/admin/users/subscriptionplan/{}/change/">{}</a>',
				obj.plan.id,
				obj.plan.name
			)
		return format_html('<span style="color:#999;">—</span>')
	get_plan_display.short_description = 'Plan'
	
	def get_status_badge(self, obj):
		"""Display status with color coding"""
		colors = {
			'active': '#10b981',
			'expired': '#ef4444',
			'cancelled': '#6b7280',
			'pending': '#f59e0b',
		}
		color = colors.get(obj.status, '#6b7280')
		return format_html(
			'<span style="background-color:{}; color:white; padding:4px 8px; border-radius:4px; font-weight:600;">{}</span>',
			color, obj.get_status_display()
		)
	get_status_badge.short_description = 'Status'
	
	def get_queryset(self, request):
		"""Optimize queryset"""
		qs = super().get_queryset(request)
		return qs.select_related('user', 'plan')
	
	actions = ['activate_subscriptions', 'expire_subscriptions', 'cancel_subscriptions']
	
	def activate_subscriptions(self, request, queryset):
		"""Activate selected subscriptions"""
		for sub in queryset:
			sub.activate()
		self.message_user(request, f'{queryset.count()} subscription(s) activated.')
	activate_subscriptions.short_description = 'Activate selected subscriptions'
	
	def expire_subscriptions(self, request, queryset):
		"""Expire selected subscriptions"""
		updated = queryset.update(status=UserSubscription.SubscriptionStatus.EXPIRED)
		self.message_user(request, f'{updated} subscription(s) expired.')
	expire_subscriptions.short_description = 'Mark as expired'
	
	def cancel_subscriptions(self, request, queryset):
		"""Cancel selected subscriptions"""
		for sub in queryset:
			sub.cancel()
		self.message_user(request, f'{queryset.count()} subscription(s) cancelled.')
	cancel_subscriptions.short_description = 'Cancel selected subscriptions'


# Register models with admin
admin.site.register(CustomUser, CustomUserAdmin)
admin.site.register(Author, AuthorAdmin)
admin.site.register(SubscriptionPlan, SubscriptionPlanAdmin)
admin.site.register(UserSubscription, UserSubscriptionAdmin)
