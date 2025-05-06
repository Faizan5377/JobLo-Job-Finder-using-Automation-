from rest_framework import status, views, permissions, generics
from rest_framework.response import Response
from django.db import transaction

from .models import JobSearch, JobPost
from .serializers import JobSearchSerializer, JobPostSerializer
from .utils import scrape_jobs

class JobSearchView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        serializer = JobSearchSerializer(data=request.data)
        
        if serializer.is_valid():
            job_title = serializer.validated_data['job_title']
            location = serializer.validated_data['location']
            job_type = serializer.validated_data['job_type']
            
            # Scrape job listings
            job_listings = scrape_jobs(job_title, location, job_type)
            
            if not job_listings:
                return Response({"error": "No job listings found. Please try different search criteria."}, status=status.HTTP_404_NOT_FOUND)
            
            # Save job search and job posts in a transaction
            with transaction.atomic():
                job_search = serializer.save(user=request.user)
                
                for job in job_listings:
                    JobPost.objects.create(
                        search=job_search,
                        title=job['title'],
                        company=job['company'],
                        location=job['location'],
                        description=job['description'],
                        job_type=job['job_type'],
                        salary=job['salary'],
                        url=job['url'],
                        posted_date=job['posted_date']
                    )
                
                # Get the updated job search with job posts
                updated_job_search = JobSearch.objects.get(id=job_search.id)
                result_serializer = JobSearchSerializer(updated_job_search)
                
                return Response(result_serializer.data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class JobSearchListView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = JobSearchSerializer
    
    def get_queryset(self):
        return JobSearch.objects.filter(user=self.request.user).order_by('-created_at')

class JobSearchDetailView(generics.RetrieveAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = JobSearchSerializer
    
    def get_queryset(self):
        return JobSearch.objects.filter(user=self.request.user)