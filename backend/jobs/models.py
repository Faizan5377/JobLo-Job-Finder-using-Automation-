from django.db import models
from django.conf import settings

class JobSearch(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='job_searches')
    job_title = models.CharField(max_length=255)
    location = models.CharField(max_length=255)
    job_type = models.CharField(max_length=50)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.job_title} in {self.location} - {self.job_type}"

class JobPost(models.Model):
    search = models.ForeignKey(JobSearch, on_delete=models.CASCADE, related_name='job_posts')
    title = models.CharField(max_length=255)
    company = models.CharField(max_length=255)
    location = models.CharField(max_length=255)
    description = models.TextField()
    job_type = models.CharField(max_length=50)
    salary = models.CharField(max_length=100, blank=True, null=True)
    url = models.URLField()
    posted_date = models.CharField(max_length=100)
    scraped_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.title} at {self.company}"