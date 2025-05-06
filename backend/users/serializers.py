from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
import re

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):

    phone_number = serializers.CharField(required=False, allow_blank=True)
    
    def validate_phone_number(self, value):
        if not value:
            return value
            
        # Check for format: 03xxxxxxxxx
        pakistani_format1 = r'^03[0-9]{9}$'
        
        # Check for format: +92xxxxxxxxxx
        pakistani_format2 = r'^\+92[0-9]{10}$'
        
        if not (re.match(pakistani_format1, value) or re.match(pakistani_format2, value)):
            raise serializers.ValidationError(
                "Please enter a valid Pakistani phone number (03xxxxxxxxx or +92xxxxxxxxxx)"
            )
            
        return value

    class Meta:
        model = User
        fields = ['id', 'name', 'email', 'phone_number', 'is_email_verified']
        read_only_fields = ['id', 'email', 'is_email_verified']

class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ['name', 'email', 'password', 'password_confirm']

    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        return data

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user = User.objects.create_user(
            name=validated_data['name'],
            email=validated_data['email'],
            password=validated_data['password']
        )
        return user

class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, validators=[validate_password])
    confirm_new_password = serializers.CharField(required=True)

    def validate(self, data):
        if data['new_password'] != data['confirm_new_password']:
            raise serializers.ValidationError({"new_password": "Password fields didn't match."})
        return data