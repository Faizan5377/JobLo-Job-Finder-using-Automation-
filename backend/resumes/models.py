import os
import uuid
from django.db import models
from django.conf import settings

def resume_file_path(instance, filename):
    """Generate file path for new resume."""
    ext = filename.split('.')[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    return os.path.join('resumes', str(instance.user.id), filename)

class Resume(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='resume')
    file = models.FileField(upload_to=resume_file_path)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.user.email}'s Resume"
    
    def save(self, *args, **kwargs):
        # Delete old file when replacing with a new one
        if self.pk:
            old_instance = Resume.objects.get(pk=self.pk)
            if old_instance.file and self.file != old_instance.file:
                old_instance.file.delete(save=False)
        super().save(*args, **kwargs)
    
    def delete(self, *args, **kwargs):
        # Delete the file when the model instance is deleted
        if self.file:
            self.file.delete(save=False)
        super().delete(*args, **kwargs)


class ResumeSuggestion(models.Model):
     # Add a UUID field for easier lookup
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    resume = models.ForeignKey(Resume, on_delete=models.CASCADE, related_name='suggestions')
    created_at = models.DateTimeField(auto_now_add=True)
    suggestion_data = models.JSONField(default=dict) # Add default=dict
    status = models.CharField(max_length=20, default='pending') # Add status field
    
    def __str__(self):
        return f"Suggestion {self.id} for {self.resume.user.email}'s Resume ({self.status})"
