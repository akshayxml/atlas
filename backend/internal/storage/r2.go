package storage

import (
	"context"
	"fmt"
	"io"
	"os"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

// UploadToR2 handles the S3-compatible push to Cloudflare
func UploadToR2(file io.Reader, objectKey string, contentType string) (string, error) {
	accountID := os.Getenv("R2_ACCOUNT_ID")
	accessKey := os.Getenv("R2_ACCESS_KEY_ID")
	secretKey := os.Getenv("R2_SECRET_ACCESS_KEY")
	bucketName := os.Getenv("R2_BUCKET_NAME")
	publicDomain := os.Getenv("R2_PUBLIC_DOMAIN")

	if accountID == "" || accessKey == "" || secretKey == "" || bucketName == "" || publicDomain == "" {
		return "", fmt.Errorf("missing R2 environment variables")
	}

	// 1. Configure the S3 Client for Cloudflare R2
	r2Resolver := aws.EndpointResolverWithOptionsFunc(func(service, region string, options ...interface{}) (aws.Endpoint, error) {
		return aws.Endpoint{
			URL: fmt.Sprintf("https://%s.r2.cloudflarestorage.com", accountID),
		}, nil
	})

	cfg, err := config.LoadDefaultConfig(context.TODO(),
		config.WithEndpointResolverWithOptions(r2Resolver),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(accessKey, secretKey, "")),
		config.WithRegion("auto"),
	)
	if err != nil {
		return "", err
	}

	client := s3.NewFromConfig(cfg)

	// 2. Upload the file
	_, err = client.PutObject(context.TODO(), &s3.PutObjectInput{
		Bucket:      aws.String(bucketName),
		Key:         aws.String(objectKey),
		Body:        file,
		ContentType: aws.String(contentType),
	})
	if err != nil {
		return "", err
	}

	// 3. Return the public URL
	return fmt.Sprintf("https://%s/%s", publicDomain, objectKey), nil
}

// DeleteFromR2 deletes an object from Cloudflare R2
func DeleteFromR2(objectKey string) error {
	accountID := os.Getenv("R2_ACCOUNT_ID")
	accessKey := os.Getenv("R2_ACCESS_KEY_ID")
	secretKey := os.Getenv("R2_SECRET_ACCESS_KEY")
	bucketName := os.Getenv("R2_BUCKET_NAME")

	if accountID == "" || accessKey == "" || secretKey == "" || bucketName == "" {
		return fmt.Errorf("missing R2 environment variables")
	}

	r2Resolver := aws.EndpointResolverWithOptionsFunc(func(service, region string, options ...interface{}) (aws.Endpoint, error) {
		return aws.Endpoint{
			URL: fmt.Sprintf("https://%s.r2.cloudflarestorage.com", accountID),
		}, nil
	})

	cfg, err := config.LoadDefaultConfig(context.TODO(),
		config.WithEndpointResolverWithOptions(r2Resolver),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(accessKey, secretKey, "")),
		config.WithRegion("auto"),
	)
	if err != nil {
		return err
	}

	client := s3.NewFromConfig(cfg)

	_, err = client.DeleteObject(context.TODO(), &s3.DeleteObjectInput{
		Bucket: aws.String(bucketName),
		Key:    aws.String(objectKey),
	})
	return err
}
