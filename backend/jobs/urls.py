from django.urls import path
from .views import JobSearchView, JobSearchListView, JobSearchDetailView

urlpatterns = [
    path('search/', JobSearchView.as_view(), name='job-search'),
    path('searches/', JobSearchListView.as_view(), name='job-search-list'),
    path('searches/<int:pk>/', JobSearchDetailView.as_view(), name='job-search-detail'),
]