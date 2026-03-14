from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from datetime import timedelta
from apps.core.utils import author_image_upload_path
from apps.core.validators import validate_author_image


class CustomUser(AbstractUser):
    """
    Custom User model extending Django's AbstractUser.
    Includes role-based access control and subscription management.
    """
    
    class UserRole(models.TextChoices):
        ADMIN = 'admin', _('Admin')
        EDITOR = 'editor', _('Editor')
        JOURNALIST = 'journalist', _('Journalist')
        SUBSCRIBER = 'subscriber', _('Subscriber')
    
    role = models.CharField(
        max_length=20,
        choices=UserRole.choices,
        default=UserRole.SUBSCRIBER,
        help_text='User role for permission management'
    )
    phone_number = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        help_text='Contact phone number'
    )
    is_subscribed = models.BooleanField(
        default=False,
        help_text='Whether user has an active subscription'
    )
    subscription_start = models.DateTimeField(
        blank=True,
        null=True,
        help_text='Subscription start date'
    )
    subscription_end = models.DateTimeField(
        blank=True,
        null=True,
        help_text='Subscription expiry date'
    )
    email_notifications = models.BooleanField(
        default=True,
        help_text='Receive email notifications for news and updates'
    )
    newsletter_subscription = models.BooleanField(
        default=True,
        help_text='Subscribe to newsletter'
    )
    
    class Meta:
        ordering = ['-date_joined']
        verbose_name = _('User')
        verbose_name_plural = _('Users')
    
    def __str__(self):
        return self.get_full_name() or self.username
    
    @property
    def is_active_staff(self):
        """Check if user is admin or editor"""
        return self.role in [self.UserRole.ADMIN, self.UserRole.EDITOR]
    
    @property
    def has_active_subscription(self):
        """Check if user has an active subscription or is admin"""
        if self.role == self.UserRole.ADMIN:
            return True
        if self.is_subscribed and self.subscription_end:
            return self.subscription_end >= timezone.now()
        return False
    
    def activate_subscription(self, days=30):
        """Activate subscription for specified number of days"""
        self.is_subscribed = True
        self.subscription_start = timezone.now()
        self.subscription_end = timezone.now() + timedelta(days=days)
        self.save()
    
    def deactivate_subscription(self):
        """Deactivate subscription"""
        self.is_subscribed = False
        self.subscription_end = timezone.now()
        self.save()


class Author(models.Model):
    """
    Public-facing content creator profile.
    Linked to CustomUser for authentication but separate for editorial independence.
    """
    
    user = models.OneToOneField(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='author_profile'
    )
    bio = models.TextField(
        blank=True,
        help_text='Author biography'
    )
    designation = models.CharField(
        max_length=100,
        blank=True,
        help_text='e.g., Chief Political Analyst, Technology Editor'
    )
    profile_image = models.ImageField(
        upload_to=author_image_upload_path,
        blank=True,
        null=True,
        validators=[validate_author_image],
        help_text='Author profile picture'
    )
    twitter_url = models.URLField(
        blank=True,
        null=True,
        help_text='Twitter/X profile URL'
    )
    linkedin_url = models.URLField(
        blank=True,
        null=True,
        help_text='LinkedIn profile URL'
    )
    facebook_url = models.URLField(
        blank=True,
        null=True,
        help_text='Facebook profile URL'
    )
    website_url = models.URLField(
        blank=True,
        null=True,
        help_text='Personal website URL'
    )
    is_featured = models.BooleanField(
        default=False,
        help_text='Show on homepage and about page'
    )
    article_count = models.PositiveIntegerField(
        default=0,
        editable=False,
        help_text='Number of articles published'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = _('Author')
        verbose_name_plural = _('Authors')
    
    def __str__(self):
        return f"{self.get_full_name()} - {self.designation}"
    
    def get_full_name(self):
        """Get author's full name from related user"""
        return self.user.get_full_name() or self.user.username
    
    def get_social_links(self):
        """Return dictionary of non-empty social media links"""
        social_links = {}
        if self.twitter_url:
            social_links['twitter'] = self.twitter_url
        if self.linkedin_url:
            social_links['linkedin'] = self.linkedin_url
        if self.facebook_url:
            social_links['facebook'] = self.facebook_url
        if self.website_url:
            social_links['website'] = self.website_url
        return social_links


class SubscriptionPlan(models.Model):
    """
    Subscription plans for premium content access
    """
    
    class PlanType(models.TextChoices):
        FREE = 'free', _('Free')
        MONTHLY = 'monthly', _('Monthly')
        QUARTERLY = 'quarterly', _('Quarterly')
        YEARLY = 'yearly', _('Yearly')
    
    name = models.CharField(
        max_length=100,
        help_text='Plan name (e.g., Basic, Premium, Enterprise)'
    )
    plan_type = models.CharField(
        max_length=20,
        choices=PlanType.choices,
        default=PlanType.MONTHLY
    )
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text='Price in USD'
    )
    duration_days = models.PositiveIntegerField(
        help_text='Subscription duration in days'
    )
    description = models.TextField(
        blank=True,
        help_text='Plan description and features'
    )
    is_active = models.BooleanField(
        default=True,
        help_text='Whether this plan is available for purchase'
    )
    features = models.JSONField(
        default=list,
        blank=True,
        help_text='List of features included in this plan (e.g., ["Advanced Analytics", "Priority Support", "Custom Reports"])'
    )
    includes_email_notifications = models.BooleanField(
        default=True,
        help_text='Plan includes email notifications'
    )
    includes_newsletter = models.BooleanField(
        default=True,
        help_text='Plan includes newsletter subscription'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['price']
        verbose_name = _('Subscription Plan')
        verbose_name_plural = _('Subscription Plans')
    
    def __str__(self):
        return f"{self.name} - ${self.price} ({self.get_plan_type_display()})"


class UserSubscription(models.Model):
    """
    Track user subscriptions and their status
    """
    
    class SubscriptionStatus(models.TextChoices):
        ACTIVE = 'active', _('Active')
        EXPIRED = 'expired', _('Expired')
        CANCELLED = 'cancelled', _('Cancelled')
        PENDING = 'pending', _('Pending')
    
    user = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='subscriptions'
    )
    plan = models.ForeignKey(
        SubscriptionPlan,
        on_delete=models.SET_NULL,
        null=True,
        related_name='user_subscriptions'
    )
    status = models.CharField(
        max_length=20,
        choices=SubscriptionStatus.choices,
        default=SubscriptionStatus.PENDING
    )
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    auto_renew = models.BooleanField(
        default=False,
        help_text='Whether subscription auto-renews'
    )
    payment_reference = models.CharField(
        max_length=255,
        blank=True,
        help_text='Payment gateway transaction reference'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = _('User Subscription')
        verbose_name_plural = _('User Subscriptions')
    
    def __str__(self):
        return f"{self.user.username} - {self.plan.name if self.plan else 'No Plan'} ({self.get_status_display()})"
    
    @property
    def is_active(self):
        """Check if subscription is currently active"""
        return self.status == self.SubscriptionStatus.ACTIVE and self.end_date >= timezone.now()
    
    def activate(self):
        """Activate this subscription"""
        self.status = self.SubscriptionStatus.ACTIVE
        self.user.activate_subscription((self.end_date - self.start_date).days)
        self.save()
    
    def cancel(self):
        """Cancel this subscription"""
        self.status = self.SubscriptionStatus.CANCELLED
        self.user.deactivate_subscription()
        self.save()
    
    def renew(self, days=None):
        """Renew subscription for another period"""
        if days is None and self.plan:
            days = self.plan.duration_days
        self.end_date = timezone.now() + timedelta(days=days)
        self.status = self.SubscriptionStatus.ACTIVE
        self.user.activate_subscription(days)
        self.save()
