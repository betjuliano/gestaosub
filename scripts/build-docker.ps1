# Build script for GestãoSub Docker image (PowerShell version)
# This script builds an optimized production Docker image

param(
    [switch]$Test = $false,
    [string]$Tag = "latest"
)

# Colors for output
$Red = "`e[31m"
$Green = "`e[32m"
$Yellow = "`e[33m"
$Reset = "`e[0m"

Write-Host "${Yellow}Building GestãoSub Docker image...${Reset}"

# Check if Docker is running
try {
    docker info | Out-Null
} catch {
    Write-Host "${Red}Error: Docker is not running. Please start Docker and try again.${Reset}"
    exit 1
}

# Build the image
Write-Host "${Yellow}Building production image...${Reset}"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"

try {
    docker build `
        --tag "gestaosub:$Tag" `
        --tag "gestaosub:$timestamp" `
        --build-arg NODE_ENV=production `
        .
    
    Write-Host "${Green}Build completed successfully!${Reset}"
    
    # Show image size
    Write-Host "${Yellow}Image size:${Reset}"
    docker images gestaosub:$Tag --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"
    
    # Optional: Run a quick test
    if ($Test) {
        Write-Host "${Yellow}Running quick test...${Reset}"
        
        # Start container in background
        $containerId = docker run -d -p 3000:3000 -e DATABASE_URL="postgresql://test:test@localhost:5432/test" "gestaosub:$Tag"
        
        # Wait for container to start
        Start-Sleep -Seconds 10
        
        try {
            # Test health endpoint
            $response = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -TimeoutSec 5
            if ($response.StatusCode -eq 200) {
                Write-Host "${Green}Health check passed!${Reset}"
            } else {
                Write-Host "${Red}Health check failed! Status: $($response.StatusCode)${Reset}"
            }
        } catch {
            Write-Host "${Red}Health check failed! Error: $($_.Exception.Message)${Reset}"
        } finally {
            # Stop and remove test container
            docker stop $containerId | Out-Null
            docker rm $containerId | Out-Null
        }
    }
    
    Write-Host "${Green}Docker build process completed!${Reset}"
    
} catch {
    Write-Host "${Red}Build failed: $($_.Exception.Message)${Reset}"
    exit 1
}