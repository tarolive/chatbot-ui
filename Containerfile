# Use an official Nginx runtime as a parent image
FROM registry.access.redhat.com/ubi9/nginx-124@sha256:a39459f55e5f8df68b9b58fd33cd53c8acabbbb9cd3df1a071187e071858f32f

# Copy the dist folder to the Nginx html directory
COPY dist /usr/share/nginx/html

# Expose port 80 to the outside world
EXPOSE 80

# Command to run Nginx
CMD ["nginx", "-g", "daemon off;"]