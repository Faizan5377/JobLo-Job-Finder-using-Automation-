import requests
from bs4 import BeautifulSoup
import re
import json
import random
import time
from typing import List, Dict, Any

def scrape_indeed_jobs(job_title: str, location: str, job_type: str) -> List[Dict[Any, Any]]:
    """
    Scrape job listings from Indeed based on the given parameters.
    
    Args:
        job_title: The job title to search for
        location: The location to search in
        job_type: The type of job (full-time, part-time, etc.)
    
    Returns:
        A list of dictionaries containing job details
    """
    # Format parameters for Indeed URL
    formatted_job_title = job_title.replace(' ', '+')
    formatted_location = location.replace(' ', '+')
    
    # Map job_type to Indeed's job type parameter
    job_type_map = {
        'full-time': 'fulltime',
        'part-time': 'parttime',
        'contract': 'contract',
        'temporary': 'temporary',
        'internship': 'internship',
        'remote': 'remote'
    }
    
    indeed_job_type = job_type_map.get(job_type.lower(), '')
    
    # Construct the Indeed URL
    url = f"https://www.indeed.com/jobs?q={formatted_job_title}&l={formatted_location}"
    if indeed_job_type:
        url += f"&jt={indeed_job_type}"
    
    # Set up headers to mimic a browser request
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.82 Safari/537.36'
    }
    
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        job_listings = []
        
        # Find all job cards - this may need to be updated as Indeed's HTML structure changes
        job_cards = soup.find_all('div', class_=re.compile('job_seen_beacon'))
        
        for job in job_cards:
            try:
                # Extract job details
                title_element = job.find('h2', class_='jobTitle')
                title = title_element.get_text().strip() if title_element else 'No Title'
                
                company_element = job.find('span', class_='companyName')
                company = company_element.get_text().strip() if company_element else 'No Company'
                
                location_element = job.find('div', class_='companyLocation')
                location = location_element.get_text().strip() if location_element else 'No Location'
                
                description_element = job.find('div', class_='job-snippet')
                description = description_element.get_text().strip() if description_element else 'No Description'
                
                # Extract salary if available
                salary_element = job.find('div', class_='salary-snippet')
                salary = salary_element.get_text().strip() if salary_element else None
                
                # Extract job URL
                job_url = 'https://www.indeed.com' + title_element.find('a')['href'] if title_element and title_element.find('a') else '#'
                
                # Extract posted date
                date_element = job.find('span', class_='date')
                posted_date = date_element.get_text().strip() if date_element else 'Unknown'
                
                job_listings.append({
                    'title': title,
                    'company': company,
                    'location': location,
                    'description': description,
                    'job_type': job_type,
                    'salary': salary,
                    'url': job_url,
                    'posted_date': posted_date
                })
            except Exception as e:
                print(f"Error parsing job card: {str(e)}")
                continue
        
        return job_listings
    except requests.exceptions.RequestException as e:
        print(f"Error fetching Indeed jobs: {str(e)}")
        return []

def scrape_linkedin_jobs(job_title: str, location: str, job_type: str) -> List[Dict[Any, Any]]:
    """
    Scrape job listings from LinkedIn based on the given parameters.
    
    Args:
        job_title: The job title to search for
        location: The location to search in
        job_type: The type of job (full-time, part-time, etc.)
    
    Returns:
        A list of dictionaries containing job details
    """
    # Format parameters for LinkedIn URL
    formatted_job_title = job_title.replace(' ', '%20')
    formatted_location = location.replace(' ', '%20')
    
    # Map job_type to LinkedIn's job type parameter
    job_type_map = {
        'full-time': 'F',
        'part-time': 'P',
        'contract': 'C',
        'temporary': 'T',
        'internship': 'I',
        'remote': 'R'
    }
    
    linkedin_job_type = job_type_map.get(job_type.lower(), '')
    
    # Construct the LinkedIn URL
    url = f"https://www.linkedin.com/jobs/search/?keywords={formatted_job_title}&location={formatted_location}"
    if linkedin_job_type:
        url += f"&f_JT={linkedin_job_type}"
    
    # Set up headers to mimic a browser request
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.82 Safari/537.36'
    }
    
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        job_listings = []
        
        # Find all job cards
        job_cards = soup.find_all('div', class_='base-card')
        
        for job in job_cards:
            try:
                # Extract job details
                title_element = job.find('h3', class_='base-search-card__title')
                title = title_element.get_text().strip() if title_element else 'No Title'
                
                company_element = job.find('h4', class_='base-search-card__subtitle')
                company = company_element.get_text().strip() if company_element else 'No Company'
                
                location_element = job.find('span', class_='job-search-card__location')
                location = location_element.get_text().strip() if location_element else 'No Location'
                
                # Extract job URL
                job_url = job.find('a', class_='base-card__full-link')['href'] if job.find('a', class_='base-card__full-link') else '#'
                
                # Extract posted date
                date_element = job.find('time', class_='job-search-card__listdate')
                posted_date = date_element.get_text().strip() if date_element else 'Unknown'
                
                job_listings.append({
                    'title': title,
                    'company': company,
                    'location': location,
                    'description': 'Click to view full job description',  # LinkedIn doesn't show descriptions in search results
                    'job_type': job_type,
                    'salary': None,  # LinkedIn doesn't consistently show salary in search results
                    'url': job_url,
                    'posted_date': posted_date
                })
            except Exception as e:
                print(f"Error parsing job card: {str(e)}")
                continue
        
        return job_listings
    except requests.exceptions.RequestException as e:
        print(f"Error fetching LinkedIn jobs: {str(e)}")
        return []

def scrape_jobs(job_title: str, location: str, job_type: str) -> List[Dict[Any, Any]]:
    """
    Scrape job listings from multiple sources based on the given parameters.
    
    Args:
        job_title: The job title to search for
        location: The location to search in
        job_type: The type of job (full-time, part-time, etc.)
    
    Returns:
        A list of dictionaries containing job details
    """
    # Scrape from multiple sources
    indeed_jobs = scrape_indeed_jobs(job_title, location, job_type)
    linkedin_jobs = scrape_linkedin_jobs(job_title, location, job_type)
    
    # Combine results
    all_jobs = indeed_jobs + linkedin_jobs
    
    # Shuffle jobs to mix sources
    random.shuffle(all_jobs)
    
    return all_jobs