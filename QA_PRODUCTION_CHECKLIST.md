# CartSmash Production QA Testing Checklist

## 🚀 Pre-Production Testing Checklist

### Environment Information
- **Client Version**: 1.0.2
- **Server Version**: 1.0.0  
- **Test Date**: _____________
- **Tester**: _____________
- **Environment**: Production / Staging
- **URLs**: 
  - Client: `https://cart-smash.vercel.app`
  - API: `https://cartsmash-api.onrender.com`

---

## 1. 🔐 Authentication & User Management
**Status**: ⬜ Pass ⬜ Fail ⬜ N/A

### Firebase Authentication
- [ ] **Google Sign-In** works correctly
- [ ] **Email/Password Sign-Up** creates new accounts
- [ ] **Email/Password Login** authenticates existing users
- [ ] **Sign-Out** properly logs users out
- [ ] **Session Persistence** maintains login across browser refreshes
- [ ] **Admin Status Detection** identifies admin users correctly
- [ ] **Protected Routes** redirect non-authenticated users to login

### Test Cases:
- [ ] Create new account with Google
- [ ] Create new account with email/password  
- [ ] Login with existing credentials
- [ ] Test invalid credentials (should show error)
- [ ] Test admin-specific features (if applicable)

**Notes**: ___________________

---

## 2. 🤖 AI Services Integration  
**Status**: ⬜ Pass ⬜ Fail ⬜ N/A

### Claude AI (Anthropic)
- [ ] **Health Check**: `/api/ai/health` returns Claude availability
- [ ] **Recipe Generation**: Generates recipes from text prompts
- [ ] **Meal Plan Creation**: Creates structured 7-day meal plans
- [ ] **Grocery List Parsing**: Extracts grocery items from AI responses
- [ ] **Error Handling**: Graceful fallback when API unavailable

### ChatGPT (OpenAI) 
- [ ] **Health Check**: `/api/ai/health` returns OpenAI availability  
- [ ] **Recipe Generation**: Alternative AI service works
- [ ] **Fallback Logic**: System uses backup when primary AI fails

### Test Cases:
- [ ] Generate grocery list: "Create a healthy 7-day meal plan for family of 4"
- [ ] Test single recipe: "Give me a chicken carbonara recipe"  
- [ ] Test with AI service down (simulate network error)
- [ ] Verify intelligent parsing extracts grocery items correctly

**Notes**: ___________________

---

## 3. 📝 Recipe Import & Management
**Status**: ⬜ Pass ⬜ Fail ⬜ N/A

### URL Recipe Import
- [ ] **Valid Recipe URLs** import correctly (test with supported sites)
- [ ] **Invalid URLs** show proper error messages
- [ ] **Unsupported Sites** fallback to text input suggestion
- [ ] **Recipe Parsing** extracts title, ingredients, instructions correctly
- [ ] **Single Recipe Output** (verify fix: should create 1 recipe, not 3)

### AI Recipe Processing  
- [ ] **Single Recipe Text** creates 1 unified recipe
- [ ] **Meal Plan Text** creates multiple organized recipes
- [ ] **Ingredient Parsing** structures ingredients with quantities/units
- [ ] **Instruction Parsing** creates numbered step lists
- [ ] **Section Header Recognition** doesn't treat "Ingredients"/"Instructions" as recipe names

### Unified Recipe System
- [ ] **Recipe Storage** saves to user's recipe library
- [ ] **Recipe Retrieval** loads saved recipes correctly
- [ ] **Recipe Editing** allows modifications to saved recipes
- [ ] **Recipe Deletion** removes recipes properly
- [ ] **Format Conversion** between different recipe formats

### Test Cases:
- [ ] Import from URL: `https://kitchenswagger.com/creamy-chicken-carbonara-recipe/`
- [ ] Import meal plan text with multiple recipes
- [ ] Import single recipe text  
- [ ] Verify only 1 recipe created for single recipe content
- [ ] Save, edit, and delete recipes

**Notes**: ___________________

---

## 4. 🛒 Cart & Grocery Management
**Status**: ⬜ Pass ⬜ Fail ⬜ N/A

### Cart Functionality
- [ ] **Add Items** to cart from grocery lists
- [ ] **Remove Items** from cart
- [ ] **Update Quantities** modify item amounts
- [ ] **Cart Persistence** maintains cart across sessions
- [ ] **Cart Clearing** empties cart when requested
- [ ] **Auto-Save** preserves draft grocery lists

### Store Integration
- [ ] **Kroger Integration** connects to Kroger API
- [ ] **Instacart Integration** connects to Instacart services
- [ ] **Store Selection** allows choosing preferred stores  
- [ ] **Product Mapping** matches grocery items to store products
- [ ] **Price Retrieval** gets current pricing (if available)

### Test Cases:
- [ ] Create grocery list and add all items to cart
- [ ] Modify quantities and verify updates
- [ ] Test cart persistence across browser sessions
- [ ] Connect to external grocery services
- [ ] Test cart with 50+ items (performance)

**Notes**: ___________________

---

## 5. 🍽️ Meal Planning Features
**Status**: ⬜ Pass ⬜ Fail ⬜ N/A

### AI Meal Plan Generation
- [ ] **7-Day Plans** generate complete weekly menus
- [ ] **Family Size Customization** adjusts portions correctly
- [ ] **Dietary Restrictions** respects user preferences
- [ ] **Meal Type Organization** separates breakfast/lunch/dinner/snacks
- [ ] **Shopping List Generation** creates comprehensive grocery lists

### Meal Plan Management
- [ ] **Save Meal Plans** stores plans for later use
- [ ] **Load Saved Plans** retrieves previous meal plans
- [ ] **Edit Meal Plans** allows recipe substitutions
- [ ] **Generate Shopping Lists** from saved meal plans

### Test Cases:
- [ ] Generate meal plan: "Healthy vegetarian meals for 2 people, 7 days"
- [ ] Generate meal plan with dietary restrictions (gluten-free, etc.)
- [ ] Save and reload meal plan
- [ ] Edit recipes within a meal plan
- [ ] Generate shopping list from complex meal plan

**Notes**: ___________________

---

## 6. 🔧 API Services & Infrastructure  
**Status**: ⬜ Pass ⬜ Fail ⬜ N/A

### Core API Endpoints
- [ ] **Health Check**: `/health` returns system status
- [ ] **AI Health**: `/api/ai/health` shows AI service availability
- [ ] **CORS**: Cross-origin requests work from client domain
- [ ] **Rate Limiting**: Prevents API abuse (test with rapid requests)
- [ ] **Error Handling**: Returns proper HTTP status codes and messages

### Database Connectivity
- [ ] **MongoDB Connection** established successfully
- [ ] **Firebase Admin** connects for user management  
- [ ] **Data Persistence** saves and retrieves user data
- [ ] **Data Validation** prevents invalid data insertion

### External Service Integration  
- [ ] **Kroger API** authentication and data retrieval
- [ ] **Instacart API** connection and product lookup
- [ ] **Anthropic API** Claude AI service integration
- [ ] **OpenAI API** ChatGPT service integration

### Test Cases:
- [ ] Load test with multiple concurrent users
- [ ] Test with network interruptions
- [ ] Verify SSL certificates and HTTPS
- [ ] Test API rate limits (make 100 requests rapidly)
- [ ] Database connection failover

**Notes**: ___________________

---

## 7. 🎨 User Interface & Experience
**Status**: ⬜ Pass ⬜ Fail ⬜ N/A

### Core Navigation
- [ ] **Home Page** loads without errors
- [ ] **Navigation Menu** all links work correctly
- [ ] **Page Routing** URLs navigate to correct components
- [ ] **Back Button** browser navigation works
- [ ] **Mobile Responsiveness** UI adapts to mobile screens

### Grocery List Interface
- [ ] **Text Input** accepts and processes grocery requests
- [ ] **AI Selection** Claude/ChatGPT switching works
- [ ] **Results Display** shows formatted grocery lists
- [ ] **Add to Cart** buttons function correctly
- [ ] **Auto-Save** preserves draft content

### Recipe Management Interface
- [ ] **Recipe Import** URL input and processing
- [ ] **Recipe Display** shows formatted recipes clearly
- [ ] **Recipe Library** lists saved recipes
- [ ] **Recipe Editor** allows modifications
- [ ] **Meal Plan View** organizes recipes by day/meal type

### Test Cases:
- [ ] Test on desktop browser (Chrome, Firefox, Safari)
- [ ] Test on mobile devices (iOS Safari, Android Chrome)
- [ ] Test with slow network connection
- [ ] Verify all buttons and forms work
- [ ] Check loading states and error messages

**Notes**: ___________________

---

## 8. 🔒 Security & Performance
**Status**: ⬜ Pass ⬜ Fail ⬜ N/A

### Security
- [ ] **HTTPS** enforced on all connections
- [ ] **API Keys** not exposed in client code
- [ ] **User Data** properly isolated between users
- [ ] **Input Validation** prevents injection attacks
- [ ] **Authentication** required for protected endpoints

### Performance  
- [ ] **Page Load Times** under 3 seconds
- [ ] **API Response Times** under 2 seconds for most requests
- [ ] **AI Processing** completes within 30 seconds
- [ ] **Large Lists** handle 100+ grocery items smoothly
- [ ] **Concurrent Users** system stable with multiple users

### Test Cases:
- [ ] Test SQL injection attempts
- [ ] Verify API keys are not in browser network tab
- [ ] Load page with browser dev tools performance tab
- [ ] Test with 200+ item grocery list
- [ ] Simulate multiple users using the system simultaneously

**Notes**: ___________________

---

## 9. 🧪 Specific Bug Regression Tests
**Status**: ⬜ Pass ⬜ Fail ⬜ N/A

### Recipe Parsing Fix (Recent)
- [ ] **Single Recipe Import** creates exactly 1 recipe (not 3)
- [ ] **Section Headers** "Ingredients" and "Instructions" not treated as recipe names  
- [ ] **Recipe Structure** ingredients and instructions properly organized
- [ ] **URL Fallback** when URL import fails, AI processing works correctly

### Test Cases:
- [ ] Import URL: `https://kitchenswagger.com/creamy-chicken-carbonara-recipe/`
- [ ] Verify result: 1 recipe named "Creamy Chicken Carbonara"
- [ ] Verify ingredients list populated correctly  
- [ ] Verify instructions list populated correctly
- [ ] Test with other single recipe content

**Notes**: ___________________

---

## 10. 📊 Monitoring & Analytics
**Status**: ⬜ Pass ⬜ Fail ⬜ N/A

### Error Tracking
- [ ] **Console Errors** check browser console for JavaScript errors
- [ ] **API Errors** verify proper error responses and logging
- [ ] **Failed Requests** identify any failing network requests
- [ ] **User Actions** log important user interactions

### Performance Monitoring  
- [ ] **Response Times** measure and document API response times
- [ ] **Memory Usage** check for memory leaks during extended use
- [ ] **Network Usage** optimize for mobile data usage

### Test Cases:
- [ ] Monitor browser console during full user journey
- [ ] Check network tab for failed requests
- [ ] Use application for 30+ minutes and check for memory leaks
- [ ] Document any performance bottlenecks found

**Notes**: ___________________

---

## ✅ Final Production Readiness

### Critical Issues (Must Fix Before Production)
- [ ] No authentication failures
- [ ] No data loss or corruption  
- [ ] AI services functioning properly
- [ ] Recipe parsing working correctly (1 recipe, not 3)
- [ ] Cart functionality fully operational

### Minor Issues (Fix After Production if Time Allows)
- [ ] Performance optimizations
- [ ] UI/UX improvements  
- [ ] Additional error messaging
- [ ] Enhanced mobile experience

### Sign-off
- [ ] **QA Tester**: _________________ Date: _________
- [ ] **Developer**: _________________ Date: _________  
- [ ] **Product Owner**: _____________ Date: _________

---

## 🚨 Emergency Contacts & Rollback Plan

### Key Personnel
- **Developer**: _________________
- **DevOps**: _________________  
- **Product Owner**: _________________

### Rollback Procedures
1. **Client Rollback**: Revert to previous Vercel deployment
2. **Server Rollback**: Revert to previous Render deployment  
3. **Database Rollback**: Restore from latest backup
4. **Monitoring**: Watch error rates and user reports

### Emergency Thresholds
- **Error Rate**: > 5% of requests failing
- **Response Time**: > 10 seconds for AI requests
- **User Reports**: > 10 complaints within 1 hour

---

*Last Updated: [Date]*
*Version: 1.0*