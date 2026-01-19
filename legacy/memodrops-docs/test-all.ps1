# ===================================
# Complete Test Suite Runner
# Tests everything: Integration, Load, Security
# ===================================

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  MEMODROPS - COMPLETE TEST SUITE" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$ErrorActionPreference = "Continue"
$testsPassed = 0
$testsFailed = 0

# ===================================
# 1. CHECK REQUIREMENTS
# ===================================

Write-Host "Checking requirements..." -ForegroundColor Yellow

# Check if server is running
try {
    $health = Invoke-WebRequest -Uri "http://localhost:3333/health" -UseBasicParsing -TimeoutSec 5
    Write-Host "✅ Server is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Server is not running. Start it with: npm run dev" -ForegroundColor Red
    Write-Host "`nRun in another terminal:" -ForegroundColor Yellow
    Write-Host "  cd apps/backend" -ForegroundColor White
    Write-Host "  npm run dev" -ForegroundColor White
    exit 1
}

# Check Node.js
$nodeVersion = node --version 2>$null
if ($nodeVersion) {
    Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "❌ Node.js not found" -ForegroundColor Red
    exit 1
}

# Check if k6 is installed (optional)
$k6Version = k6 version 2>$null
if ($k6Version) {
    Write-Host "✅ k6 installed" -ForegroundColor Green
    $hasK6 = $true
} else {
    Write-Host "⚠️  k6 not installed (load tests will be skipped)" -ForegroundColor Yellow
    Write-Host "   Install: choco install k6" -ForegroundColor Gray
    $hasK6 = $false
}

Write-Host ""

# ===================================
# 2. INTEGRATION TESTS
# ===================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  INTEGRATION TESTS" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

try {
    # Compile TypeScript first
    Write-Host "Compiling TypeScript..." -ForegroundColor Yellow
    cd tests
    npx ts-node integration-test.ts
    cd ..
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ Integration tests PASSED" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host "`n❌ Integration tests FAILED" -ForegroundColor Red
        $testsFailed++
    }
} catch {
    Write-Host "`n❌ Integration tests ERROR: $_" -ForegroundColor Red
    $testsFailed++
}

Write-Host ""

# ===================================
# 3. API ENDPOINT TESTS
# ===================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  API ENDPOINT TESTS" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$endpoints = @(
    @{ Method = "GET"; Uri = "/health"; Name = "Health Check" }
    @{ Method = "GET"; Uri = "/api/plans"; Name = "Plans" }
    @{ Method = "GET"; Uri = "/api/disciplines"; Name = "Disciplines" }
    @{ Method = "GET"; Uri = "/api/admin/metrics"; Name = "Metrics" }
    @{ Method = "GET"; Uri = "/api/admin/performance/cache/stats"; Name = "Cache Stats" }
    @{ Method = "GET"; Uri = "/api/admin/security/audit"; Name = "Security Audit" }
    @{ Method = "GET"; Uri = "/api/admin/apm/dashboard"; Name = "APM Dashboard" }
)

foreach ($endpoint in $endpoints) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3333$($endpoint.Uri)" -Method $endpoint.Method -UseBasicParsing -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ $($endpoint.Name): OK" -ForegroundColor Green
            $testsPassed++
        } else {
            Write-Host "⚠️  $($endpoint.Name): Status $($response.StatusCode)" -ForegroundColor Yellow
            $testsFailed++
        }
    } catch {
        Write-Host "❌ $($endpoint.Name): FAILED" -ForegroundColor Red
        $testsFailed++
    }
}

Write-Host ""

# ===================================
# 4. PERFORMANCE TESTS
# ===================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PERFORMANCE TESTS" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

try {
    $perfMetrics = Invoke-RestMethod -Uri "http://localhost:3333/api/admin/performance/metrics" -Method GET
    
    if ($perfMetrics.success) {
        Write-Host "Performance Metrics:" -ForegroundColor Yellow
        Write-Host "  Total Endpoints: $($perfMetrics.data.Length)" -ForegroundColor White
        
        $slowEndpoints = $perfMetrics.data | Where-Object { $_.avgTime -gt 1000 }
        if ($slowEndpoints) {
            Write-Host "  ⚠️  Slow endpoints (>1s): $($slowEndpoints.Length)" -ForegroundColor Yellow
            $testsFailed++
        } else {
            Write-Host "  ✅ All endpoints fast (<1s)" -ForegroundColor Green
            $testsPassed++
        }
    }
} catch {
    Write-Host "❌ Performance test failed" -ForegroundColor Red
    $testsFailed++
}

Write-Host ""

# ===================================
# 5. SECURITY TESTS
# ===================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SECURITY TESTS" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

try {
    $securityAudit = Invoke-RestMethod -Uri "http://localhost:3333/api/admin/security/audit" -Method GET
    
    if ($securityAudit.success) {
        Write-Host "Security Score: $($securityAudit.data.score)/100" -ForegroundColor Yellow
        
        $passedChecks = ($securityAudit.data.checks | Where-Object { $_.passed }).Count
        $totalChecks = $securityAudit.data.checks.Count
        
        Write-Host "Checks Passed: $passedChecks/$totalChecks" -ForegroundColor Yellow
        
        if ($securityAudit.data.score -ge 80) {
            Write-Host "✅ Security: GOOD" -ForegroundColor Green
            $testsPassed++
        } elseif ($securityAudit.data.score -ge 60) {
            Write-Host "⚠️  Security: MODERATE" -ForegroundColor Yellow
            $testsFailed++
        } else {
            Write-Host "❌ Security: POOR" -ForegroundColor Red
            $testsFailed++
        }
        
        if ($securityAudit.data.recommendations.Length -gt 0) {
            Write-Host "`nRecommendations:" -ForegroundColor Yellow
            foreach ($rec in $securityAudit.data.recommendations) {
                Write-Host "  - $rec" -ForegroundColor Gray
            }
        }
    }
} catch {
    Write-Host "❌ Security test failed" -ForegroundColor Red
    $testsFailed++
}

Write-Host ""

# ===================================
# 6. LOAD TESTS (if k6 available)
# ===================================

if ($hasK6) {
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  LOAD TESTS (k6)" -ForegroundColor Cyan
    Write-Host "========================================`n" -ForegroundColor Cyan
    
    Write-Host "⚠️  This will take ~5 minutes..." -ForegroundColor Yellow
    Write-Host ""
    
    try {
        k6 run tests/load-test.js --quiet
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "`n✅ Load tests PASSED" -ForegroundColor Green
            $testsPassed++
        } else {
            Write-Host "`n⚠️  Load tests had issues" -ForegroundColor Yellow
            $testsFailed++
        }
    } catch {
        Write-Host "`n❌ Load tests FAILED" -ForegroundColor Red
        $testsFailed++
    }
    
    Write-Host ""
}

# ===================================
# 7. APM HEALTH SCORE
# ===================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  APM HEALTH SCORE" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

try {
    $healthScore = Invoke-RestMethod -Uri "http://localhost:3333/api/admin/apm/health-score" -Method GET
    
    if ($healthScore.success) {
        Write-Host "Overall Score: $($healthScore.data.score)/100" -ForegroundColor Yellow
        Write-Host "Grade: $($healthScore.data.grade)" -ForegroundColor Yellow
        
        Write-Host "`nFactors:" -ForegroundColor Yellow
        foreach ($factor in $healthScore.data.factors.PSObject.Properties) {
            Write-Host "  $($factor.Name): $($factor.Value)" -ForegroundColor White
        }
        
        if ($healthScore.data.grade -in @('A', 'B')) {
            Write-Host "`n✅ Health: EXCELLENT" -ForegroundColor Green
            $testsPassed++
        } elseif ($healthScore.data.grade -eq 'C') {
            Write-Host "`n⚠️  Health: GOOD" -ForegroundColor Yellow
            $testsFailed++
        } else {
            Write-Host "`n❌ Health: NEEDS IMPROVEMENT" -ForegroundColor Red
            $testsFailed++
        }
    }
} catch {
    Write-Host "❌ Health score test failed" -ForegroundColor Red
    $testsFailed++
}

Write-Host ""

# ===================================
# FINAL SUMMARY
# ===================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  FINAL SUMMARY" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$totalTests = $testsPassed + $testsFailed
$successRate = if ($totalTests -gt 0) { [math]::Round(($testsPassed / $totalTests) * 100, 2) } else { 0 }

Write-Host "Tests Passed: $testsPassed" -ForegroundColor Green
Write-Host "Tests Failed: $testsFailed" -ForegroundColor Red
Write-Host "Success Rate: $successRate%" -ForegroundColor Yellow

Write-Host ""

if ($testsFailed -eq 0) {
    Write-Host "🎉 ALL TESTS PASSED! System is production-ready!" -ForegroundColor Green
    exit 0
} elseif ($successRate -ge 80) {
    Write-Host "⚠️  Most tests passed. Review failures above." -ForegroundColor Yellow
    exit 0
} else {
    Write-Host "❌ Too many failures. System needs attention." -ForegroundColor Red
    exit 1
}
