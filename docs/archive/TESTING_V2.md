# PatternStack MCP Client v2.0 - Testing Guide

**Status**: 🧪 **PRE-DEPLOYMENT TESTING**
**DO NOT PUBLISH until all tests pass!**

---

## 📋 Testing Checklist

### Phase 1: Build & Dependencies ✅

- [x] Package dependencies installed
- [x] TypeScript compilation successful
- [x] dist/index-v2.js generated
- [x] Type definitions generated
- [ ] No TypeScript errors
- [ ] No dependency vulnerabilities

### Phase 2: Local Unit Tests ⏳

- [ ] Server-side detection endpoint works
- [ ] API authentication works
- [ ] package.json parsing works
- [ ] .patternstackignore parsing works
- [ ] Response formatting works
- [ ] Error handling works

### Phase 3: Integration Tests ⏳

- [ ] MCP client connects to server
- [ ] scan_project tool works end-to-end
- [ ] Security scanning integrated
- [ ] Recommendations included
- [ ] Network effects updating
- [ ] Rate limiting respects tiers

### Phase 4: Real-World Tests ⏳

- [ ] Test with Claude Desktop
- [ ] Test with Cursor
- [ ] Test with different project types
- [ ] Test error scenarios
- [ ] Test with invalid API keys
- [ ] Test with expired API keys

### Phase 5: Performance Tests ⏳

- [ ] Response time < 500ms
- [ ] Token usage ~180 tokens
- [ ] Memory usage reasonable
- [ ] No memory leaks
- [ ] Handles large package.json files

### Phase 6: Security Tests ⏳

- [ ] API keys not logged
- [ ] No sensitive data in responses
- [ ] Detection rules not exposed
- [ ] HTTPS only in production
- [ ] Input validation works

---

## 🧪 Test Scripts

### 1. Build Test

```bash
cd packages/mcp-server

# Clean build
rm -rf dist
npm run build:v2

# Check output
ls -la dist/index-v2.*

# Should see:
# - index-v2.js
# - index-v2.d.ts
# - index-v2.js.map
# - index-v2.d.ts.map
```

**Expected**: All files generated without errors

---

### 2. Server-Side Detection Test

```bash
# From project root
node test-mcp-scan-full.js
```

**Expected Output**:

```
✅ SUCCESS!

🔒 FRAMEWORKS DETECTED (SERVER-SIDE):
   Total: 5 frameworks
   - next (framework) v15.0.0 - 98% confidence
   - react (frontend) v19.0.0 - 97% confidence
   ...

✅ ARCHITECTURE VALIDATION:
   🔒 Detection rules NOT exposed to client
   🔒 All proprietary IP protected!
```

---

### 3. Thin Client Connection Test

```bash
cd packages/mcp-server

# Set environment variables
export PATTERNSTACK_API_KEY="your_api_key_here"
export PATTERNSTACK_API_URL="http://localhost:3000"

# Test connection
node dist/index-v2.js <<EOF
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list"
}
EOF
```

**Expected Output**:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [
      {
        "name": "scan_project",
        "description": "Scan project and get framework detection, security analysis..."
      }
    ]
  }
}
```

---

### 4. Full Scan Test

Create a test project:

```bash
mkdir -p /tmp/test-patternstack-project
cd /tmp/test-patternstack-project

cat > package.json <<EOF
{
  "name": "test-project",
  "dependencies": {
    "react": "^19.0.0",
    "next": "^15.0.0",
    "lodash": "^4.17.20"
  }
}
EOF
```

Test the scan:

```bash
cd packages/mcp-server

node dist/index-v2.js <<EOF
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "scan_project",
    "arguments": {
      "projectPath": "/tmp/test-patternstack-project"
    }
  }
}
EOF
```

**Expected**:

- Frameworks detected (react, next, lodash)
- Security warning about lodash@4.17.20
- Recommendations returned
- Response time < 1 second

---

### 5. IP Protection Verification Test

**CRITICAL**: Verify detection rules are NOT exposed

```bash
cd packages/mcp-server

# Check dist files DON'T contain detection rules
grep -r "DETECTION_RULES" dist/
grep -r "technology: 'next'" dist/
grep -r "confidence: 0.98" dist/

# Should return NOTHING - rules not in client!
```

**Expected**: No matches found (detection logic server-side only)

```bash
# Verify client only reads files
grep -r "readFile" dist/index-v2.js
grep -r "fetch.*scan-full" dist/index-v2.js

# Should find file reading and API calls only
```

---

### 6. Error Handling Tests

**Test 1: Missing API Key**

```bash
unset PATTERNSTACK_API_KEY

node dist/index-v2.js <<EOF
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "scan_project",
    "arguments": {"projectPath": "/tmp/test"}
  }
}
EOF
```

**Expected**: Error message about missing API key

**Test 2: Invalid Project Path**

```bash
export PATTERNSTACK_API_KEY="your_key"

node dist/index-v2.js <<EOF
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "tools/call",
  "params": {
    "name": "scan_project",
    "arguments": {"projectPath": "/nonexistent/path"}
  }
}
EOF
```

**Expected**: Error message about missing package.json

**Test 3: Invalid package.json**

```bash
mkdir -p /tmp/test-invalid
echo "invalid json" > /tmp/test-invalid/package.json

node dist/index-v2.js <<EOF
{
  "jsonrpc": "2.0",
  "id": 5,
  "method": "tools/call",
  "params": {
    "name": "scan_project",
    "arguments": {"projectPath": "/tmp/test-invalid"}
  }
}
EOF
```

**Expected**: Error message about invalid JSON

---

### 7. Claude Desktop Integration Test

**Setup**:

1. Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (Mac)
   or `%APPDATA%\Claude\claude_desktop_config.json` (Windows)

```json
{
  "mcpServers": {
    "patternstack": {
      "command": "node",
      "args": ["/full/path/to/packages/mcp-server/dist/index-v2.js"],
      "env": {
        "PATTERNSTACK_API_KEY": "your_api_key_here",
        "PATTERNSTACK_API_URL": "http://localhost:3000"
      }
    }
  }
}
```

2. Restart Claude Desktop
3. Check MCP icon shows "patternstack" connected
4. Test in chat:
   ```
   Scan my project at /path/to/your/project
   ```

**Expected**:

- Claude calls scan_project tool
- Returns framework detection
- Shows security warnings if applicable
- Lists recommendations

---

### 8. Performance Benchmark

```bash
cd packages/mcp-server

# Run 10 scans and measure time
time for i in {1..10}; do
  node dist/index-v2.js <<EOF
{
  "jsonrpc": "2.0",
  "id": $i,
  "method": "tools/call",
  "params": {
    "name": "scan_project",
    "arguments": {"projectPath": "/tmp/test-patternstack-project"}
  }
}
EOF
done
```

**Expected**:

- Average response time: < 500ms per scan
- No memory growth over multiple calls
- Consistent performance

---

### 9. Token Usage Verification

```bash
# Count approximate tokens in response
node dist/index-v2.js <<EOF
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "scan_project",
    "arguments": {"projectPath": "/tmp/test-patternstack-project"}
  }
}
EOF | jq -r '.result.content[0].text' | wc -c
```

**Expected**: ~700-900 characters (~175-225 tokens)
**Target**: < 200 tokens (29% improvement over v1.0)

---

### 10. Security Scanning Integration Test

Create test project with vulnerability:

```bash
mkdir -p /tmp/test-security
cd /tmp/test-security

cat > package.json <<EOF
{
  "name": "test-security",
  "dependencies": {
    "lodash": "4.17.20",
    "moment": "2.29.1"
  }
}
EOF
```

Scan:

```bash
cd packages/mcp-server

node dist/index-v2.js <<EOF
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "scan_project",
    "arguments": {
      "projectPath": "/tmp/test-security",
      "includeSecurity": true
    }
  }
}
EOF
```

**Expected Output** (should contain):

```
⚠️  SECURITY ALERTS (1 critical):

  🔴 lodash@4.17.20 - CVE-2021-23337
     Severity: CRITICAL | Confidence: VERIFIED
     92% of developers fixed this
     Fix: Upgrade to lodash@4.17.21
```

---

## 🔍 Manual Verification Checklist

### Before Every Test Run

- [ ] Latest server code deployed locally (`npm run dev`)
- [ ] Database migrations applied
- [ ] API key created and active
- [ ] Environment variables set correctly
- [ ] No other MCP servers interfering

### During Testing

- [ ] Watch server logs for errors
- [ ] Monitor database for PackageCooccurrence updates
- [ ] Check API usage is being logged
- [ ] Verify response times in server logs
- [ ] Look for any TypeScript errors

### After Testing

- [ ] Check for memory leaks
- [ ] Verify no sensitive data logged
- [ ] Clean up test projects
- [ ] Review API usage analytics
- [ ] Document any issues found

---

## 🐛 Known Issues to Test

### Issue 1: Package.json with Comments

- Test with `package.json` containing comments
- **Expected**: Graceful error or comment stripping

### Issue 2: Large package.json Files

- Test with projects having 100+ dependencies
- **Expected**: Handles without timeout or crash

### Issue 3: Network Interruptions

- Test with server temporarily offline
- **Expected**: Clear error message, retry logic

### Issue 4: Rate Limiting

- Test with free tier user hitting limits
- **Expected**: Clear upgrade message

### Issue 5: Expired API Keys

- Test with expired key
- **Expected**: Clear error, not 500

---

## 📊 Success Criteria

Before deploying v2.0, ALL of these must pass:

### Core Functionality ✅

- [ ] Compiles without errors
- [ ] Connects to MCP protocol correctly
- [ ] Scans projects successfully
- [ ] Returns formatted responses

### IP Protection 🔒

- [ ] Detection rules NOT in dist/
- [ ] No confidence scoring in client
- [ ] No pattern matching in client
- [ ] Only file reading + API calls

### Performance ⚡

- [ ] Response time < 500ms
- [ ] Token usage ~180 tokens
- [ ] Memory usage < 50MB
- [ ] No memory leaks

### Security 🛡️

- [ ] API keys not logged
- [ ] HTTPS in production
- [ ] Input validation works
- [ ] CVE scanning integrated

### User Experience 💫

- [ ] Clear error messages
- [ ] Works with Claude Desktop
- [ ] Works with Cursor
- [ ] Documentation accurate

---

## 🚀 Deployment Readiness

### Pre-Deployment Checklist

- [ ] All tests passing
- [ ] No known critical bugs
- [ ] Documentation complete
- [ ] Migration guide ready
- [ ] Support plan in place

### Deployment Steps (DO NOT RUN YET!)

1. [ ] Final test run
2. [ ] Version bump to 2.0.0
3. [ ] Update README
4. [ ] Create GitHub release
5. [ ] Publish to npm
6. [ ] Monitor for issues
7. [ ] Deprecate v1.0

---

## 📞 Issue Reporting

If you find issues during testing:

1. Document the issue clearly
2. Include reproduction steps
3. Note expected vs actual behavior
4. Check if it's a blocker for launch
5. Create GitHub issue if needed

**Critical Issues** (Block deployment):

- IP exposed in client code
- Security vulnerabilities
- Data loss or corruption
- Complete feature failure

**Non-Critical Issues** (Can deploy with known issues):

- UI polish
- Performance optimizations
- Edge case handling
- Documentation improvements

---

## 🎯 Next Steps

1. **Run all tests above**
2. **Document results** in a separate file
3. **Fix any critical issues** found
4. **Re-test** after fixes
5. **Get approval** before npm publish
6. **Deploy!** 🚀

**Remember**: Once published to npm, there's no going back. Take your time with testing!
