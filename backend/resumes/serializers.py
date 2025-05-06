from rest_framework import serializers
from .models import Resume, ResumeSuggestion
import logging # Add logging

logger = logging.getLogger(__name__)

class ResumeSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Resume
        fields = ['id', 'file', 'file_url', 'uploaded_at', 'updated_at']
        read_only_fields = ['id', 'uploaded_at', 'updated_at']
    
    def get_file_url(self, obj):
        request = self.context.get('request')
        if obj.file and request:
            return request.build_absolute_uri(obj.file.url)
        return None

class ResumeSuggestionSerializer(serializers.ModelSerializer):
    suggestion_data = serializers.JSONField() # Keep as JSONField
    resume_id = serializers.ReadOnlyField(source='resume.id')
    user_id = serializers.ReadOnlyField(source='resume.user.id')

    class Meta:
        model = ResumeSuggestion
        fields = ['id', 'resume_id', 'user_id', 'created_at', 'status', 'suggestion_data']
        read_only_fields = ['id', 'resume_id', 'user_id', 'created_at'] # Status might be updated

    def to_representation(self, instance):
        """Ensure the suggestion_data is properly structured or provides error info."""
        representation = super().to_representation(instance)
        suggestion_data = representation.get('suggestion_data', {})

        if instance.status == 'error':
            # If status is error, ensure suggestion_data contains the error message
            if not isinstance(suggestion_data, dict) or 'error' not in suggestion_data:
                 representation['suggestion_data'] = {'error': 'An unknown error occurred during analysis.'}
            # Ensure other analysis fields are not present if it's an error state
            representation['suggestion_data'] = {'error': suggestion_data.get('error', 'Analysis failed.')}

        elif instance.status == 'completed':
            # If completed, validate the structure (similar to before, but simplified)
            default_structure = {
                "overall_score": 5, "strengths": [], "weaknesses": [],
                "improvement_suggestions": [], "section_feedback": {}
            }
            if not isinstance(suggestion_data, dict):
                logger.warning(f"Suggestion {instance.id} data is not a dict: {suggestion_data}. Returning default structure.")
                representation['suggestion_data'] = default_structure
            else:
                # Basic check for key fields
                for key, default_value in default_structure.items():
                    if key not in suggestion_data:
                        logger.warning(f"Suggestion {instance.id} missing key '{key}'. Adding default.")
                        suggestion_data[key] = default_value
                representation['suggestion_data'] = suggestion_data # Assign potentially modified dict back
        elif instance.status == 'processing':
             representation['suggestion_data'] = {'message': 'Analysis is currently in progress.'}
        elif instance.status == 'pending':
             representation['suggestion_data'] = {'message': 'Analysis has not started yet.'}
        else: # Handle unexpected status
            logger.error(f"Suggestion {instance.id} has unexpected status: {instance.status}")
            representation['suggestion_data'] = {'error': f'Unexpected analysis status: {instance.status}'}


        return representation