from rest_framework import serializers
from .models import JobSearch, JobPost

class JobPostSerializer(serializers.ModelSerializer):
    class Meta:
        model = JobPost
        fields = ['id', 'title', 'company', 'location', 'description', 'job_type', 'salary', 'url', 'posted_date']
        read_only_fields = ['id']

class JobSearchSerializer(serializers.ModelSerializer):
    job_posts = JobPostSerializer(many=True, read_only=True)
    
    class Meta:
        model = JobSearch
        fields = ['id', 'job_title', 'location', 'job_type', 'created_at', 'job_posts']
        read_only_fields = ['id', 'created_at']