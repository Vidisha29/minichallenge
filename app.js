// Kanso Cooking Concierge Core JS logic

// Initial state
const state = {
    apiKey: localStorage.getItem('gemini_api_key') || '',
    currentScreen: 'screen-landing',
    onboarding: {
        schedule: '',
        vibes: [],
        budgetIndex: 2, // default 800
        budgets: [300, 500, 800, 1200],
        ingredients: ['eggs', 'tomatoes', 'rice', 'milk', 'butter'] // Default starter pantry
    },
    mealPlan: null,
    activeReplacements: {} // maps mealName_ingredientName -> replacementObj
};

// UI Screen List
const screens = [
    'screen-landing',
    'screen-step-schedule',
    'screen-step-vibe',
    'screen-step-budget',
    'screen-step-scanner',
    'screen-loading',
    'screen-dashboard'
];

// Mock Plans Repository for Demo / Fallback Mode (so it works instantly)
const mockPlans = {
    "default": {
        "breakfast": {
            "name": "Minimalist Soft Scrambled Eggs on Rice",
            "ingredients": ["Eggs", "Rice", "Butter", "Green Onion", "Soy Sauce"],
            "instructions": [
                "Whisk eggs in a bowl with a dash of water and soy sauce.",
                "Melt green onion butter in a hot pan over low heat.",
                "Gently fold eggs until soft curd forms (about 2 minutes).",
                "Slide over warm steamed rice. Garnish with remaining green onion."
            ],
            "prepTime": "5 mins",
            "cookTime": "10 mins",
            "nutrients": { "calories": 380, "protein": "16g", "carbs": "40g", "fat": "14g" },
            "cost": 85,
            "difficulty": "Easy",
            "whySelected": [
                "takes only 15 minutes total",
                "utilizes eggs, rice, butter from your pantry",
                "costs only ₹85",
                "provides 16g simple digestible protein",
                "fits a busy schedule perfectly"
            ]
        },
        "lunch": {
            "name": "Sautéed Tomato Butter Ramen",
            "ingredients": ["Ramen Noodles", "Tomatoes", "Butter", "Garlic", "Spices"],
            "instructions": [
                "Boil noodles in salted water, drain and set aside.",
                "Sauté chopped garlic and tomatoes in butter until soft and jammy.",
                "Toss noodles back in with a splash of noodle water and minimal spices.",
                "Emulsify sauce and serve warm in a shallow bowl."
            ],
            "prepTime": "8 mins",
            "cookTime": "10 mins",
            "nutrients": { "calories": 490, "protein": "12g", "carbs": "65g", "fat": "18g" },
            "cost": 110,
            "difficulty": "Easy",
            "whySelected": [
                "completed in under 20 minutes",
                "uses tomatoes and butter already in house",
                "costs only ₹110",
                "savory comfort food feeling",
                "reduces grocery trips by using dry stock noodles"
            ]
        },
        "dinner": {
            "name": "Steamed Rice Bowl with Garlic Milk Gravy",
            "ingredients": ["Rice", "Milk", "Butter", "Flour", "Black Pepper", "Salt"],
            "instructions": [
                "Prepare fresh rice or warm leftover rice.",
                "Melt butter, add flour, then slowly whisk in warm milk to build a smooth sauce.",
                "Season with fresh cracked black pepper and salt to taste.",
                "Pour creamy sauce over rice and enjoy simple minimalist dining."
            ],
            "prepTime": "10 mins",
            "cookTime": "15 mins",
            "nutrients": { "calories": 520, "protein": "10g", "carbs": "75g", "fat": "20g" },
            "cost": 75,
            "difficulty": "Easy",
            "whySelected": [
                "ready in 25 minutes",
                "zero shopping needed - all pantry ingredients",
                "very low cost: ₹75",
                "restorative comfort meal for high exhaustion days",
                "completely vegetarian"
            ]
        },
        "groceryList": [
            { "item": "Green Onion", "category": "Vegetables", "amount": "1 bunch", "estimatedCost": 30 },
            { "item": "Ramen Noodles", "category": "Spices", "amount": "1 pack", "estimatedCost": 40 },
            { "item": "Garlic", "category": "Vegetables", "amount": "1 bulb", "estimatedCost": 20 },
            { "item": "Soy Sauce", "category": "Spices", "amount": "50ml", "estimatedCost": 40 }
        ],
        "budgetSummary": { "totalCost": 130, "currency": "INR", "status": "Optimized" },
        "substitutions": [
            { "original": "Green Onion", "alternative": "Dry chives", "reason": "No cost addition, long shelf life" }
        ],
        "cookingTimeline": [
            { "time": "08:00 AM", "action": "Steamed eggs on rice breakfast." },
            { "time": "01:15 PM", "action": "Quick sautéed tomato ramen lunch." },
            { "time": "07:30 PM", "action": "Creamy garlic rice dinner." }
        ],
        "nutrition": { "calories": 1390, "protein": "38g", "carbs": "180g", "fat": "52g" },
        "reasoning": "This profile was balanced for an active day under ₹800 budget. Sourcing from your existing pantry ingredients (eggs, rice, tomatoes) minimized the shopping bill to just ₹130, ensuring high protein and zero waste."
    }
};

// Mock Substitutions DB when API key is not present
const mockSubstitutions = {
    "eggs": [
        { "name": "Soft Tofu", "costDifference": "+₹15", "tasteMatchPercent": 85, "reason": "Silken texture mimics scrambled egg structure, high plant protein." },
        { "name": "Flaxseed Meal", "costDifference": "-₹20", "tasteMatchPercent": 65, "reason": "Great binder, vegan-friendly, nutty flavor." }
    ],
    "tomatoes": [
        { "name": "Red Bell Pepper", "costDifference": "+₹10", "tasteMatchPercent": 80, "reason": "Provides sweetness and matching accent color when roasted." },
        { "name": "Tomato Paste", "costDifference": "-₹25", "tasteMatchPercent": 90, "reason": "Concentrated tomato flavor, highly cost-effective pantry staple." }
    ],
    "milk": [
        { "name": "Coconut Milk", "costDifference": "+₹40", "tasteMatchPercent": 75, "reason": "Rich creamy texture, adds a gentle coconut fragrance to dishes." },
        { "name": "Oat Milk", "costDifference": "+₹25", "tasteMatchPercent": 85, "reason": "Neutral creaminess, excellent dairy-free substitute for gravies." }
    ],
    "butter": [
        { "name": "Olive Oil", "costDifference": "+₹10", "tasteMatchPercent": 80, "reason": "Heart-healthy fats, savory fruitiness ideal for sautéing." },
        { "name": "Coconut Oil", "costDifference": "+₹5", "tasteMatchPercent": 70, "reason": "Provides solid cooking fat element, mild tropical taste." }
    ],
    "rice": [
        { "name": "Quinoa", "costDifference": "+₹50", "tasteMatchPercent": 80, "reason": "Higher protein count, nutty structure, low carbohydrate alternative." },
        { "name": "Cauliflower Rice", "costDifference": "+₹30", "tasteMatchPercent": 70, "reason": "Low-carb keto-friendly option, absorbs sauce flavors." }
    ],
    "default": [
        { "name": "Assorted Greens", "costDifference": "+₹20", "tasteMatchPercent": 75, "reason": "Clean alternative, adds crisp color and minerals." }
    ]
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    renderPantryChips();
    updateApiBadge();
});

// Update Header API badge status display
function updateApiBadge() {
    const badge = document.getElementById('api-status-badge');
    const input = document.getElementById('input-api-key');

    if (state.apiKey) {
        badge.textContent = 'Gemini Active';
        badge.classList.add('active');
        input.value = state.apiKey;
    } else {
        badge.textContent = 'Demo Mode';
        badge.classList.remove('active');
        input.value = '';
    }
}

// Global Nav Logic
function setScreen(screenId) {
    screens.forEach(s => {
        const el = document.getElementById(s);
        if (el) el.classList.remove('active');
    });
    const activeEl = document.getElementById(screenId);
    if (activeEl) {
        activeEl.classList.add('active');
        window.scrollTo(0, 0);
    }
    state.currentScreen = screenId;
}

// Wire Event Handlers
function setupEventListeners() {
    // Navigation
    document.getElementById('logo-button').addEventListener('click', () => setScreen('screen-landing'));
    document.getElementById('btn-restart-flow').addEventListener('click', () => setScreen('screen-step-schedule'));

    // Settings Overlay Panels
    document.getElementById('settings-toggle').addEventListener('click', () => {
        document.getElementById('settings-overlay').classList.add('active');
    });
    document.getElementById('settings-close').addEventListener('click', () => {
        document.getElementById('settings-overlay').classList.remove('active');
    });
    document.getElementById('settings-overlay').addEventListener('click', (e) => {
        if (e.target.id === 'settings-overlay') {
            document.getElementById('settings-overlay').classList.remove('active');
        }
    });

    // Save / Clear API key
    document.getElementById('btn-save-key').addEventListener('click', () => {
        const val = document.getElementById('input-api-key').value.trim();
        if (val) {
            state.apiKey = val;
            localStorage.setItem('gemini_api_key', val);
        } else {
            state.apiKey = '';
            localStorage.removeItem('gemini_api_key');
        }
        updateApiBadge();
        document.getElementById('settings-overlay').classList.remove('active');
    });
    document.getElementById('btn-clear-key').addEventListener('click', () => {
        state.apiKey = '';
        localStorage.removeItem('gemini_api_key');
        updateApiBadge();
        document.getElementById('settings-overlay').classList.remove('active');
    });

    // Landing Page Buttons
    document.getElementById('btn-start').addEventListener('click', () => setScreen('screen-step-schedule'));
    document.getElementById('btn-demo').addEventListener('click', () => {
        // See Demo bypasses onboarding and runs loading directly to mock
        triggerPlanGeneration(true);
    });

    // Step 1: Schedule Cards selection
    const scheduleCards = document.querySelectorAll('#screen-step-schedule .option-card');
    scheduleCards.forEach(card => {
        card.addEventListener('click', () => {
            scheduleCards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            state.onboarding.schedule = card.getAttribute('data-value');
            document.getElementById('btn-schedule-next').removeAttribute('disabled');
        });
    });

    document.getElementById('btn-schedule-back').addEventListener('click', () => setScreen('screen-landing'));
    document.getElementById('btn-schedule-next').addEventListener('click', () => setScreen('screen-step-vibe'));

    // Step 2: Vibe Multi-select Cards selection
    const vibeCards = document.querySelectorAll('#screen-step-vibe .chips-card');
    vibeCards.forEach(card => {
        card.addEventListener('click', () => {
            card.classList.toggle('selected');
            const val = card.getAttribute('data-value');
            if (card.classList.contains('selected')) {
                if (!state.onboarding.vibes.includes(val)) {
                    state.onboarding.vibes.push(val);
                }
            } else {
                state.onboarding.vibes = state.onboarding.vibes.filter(v => v !== val);
            }
        });
    });

    document.getElementById('btn-vibe-back').addEventListener('click', () => setScreen('screen-step-schedule'));
    document.getElementById('btn-vibe-next').addEventListener('click', () => setScreen('screen-step-budget'));

    // Step 3: Budget Range Slider mapping
    const slider = document.getElementById('budget-range');
    const sliderValText = document.getElementById('slider-val');
    slider.addEventListener('input', (e) => {
        const idx = parseInt(e.target.value, 10);
        state.onboarding.budgetIndex = idx;
        sliderValText.textContent = state.onboarding.budgets[idx];
    });

    document.getElementById('btn-budget-back').addEventListener('click', () => setScreen('screen-step-vibe'));
    document.getElementById('btn-budget-next').addEventListener('click', () => setScreen('screen-step-scanner'));

    // Step 4: Scanner triggers and text chip adds
    document.getElementById('btn-scanner-back').addEventListener('click', () => setScreen('screen-step-budget'));
    document.getElementById('btn-generate-plan').addEventListener('click', () => {
        triggerPlanGeneration(false);
    });

    const manualInput = document.getElementById('manual-ingredient-input');
    manualInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleAddManualIngredient();
        }
    });
    document.getElementById('btn-add-ingredient').addEventListener('click', handleAddManualIngredient);
    document.getElementById('btn-clear-ingredients').addEventListener('click', () => {
        state.onboarding.ingredients = [];
        renderPantryChips();
    });

    // Scanner File drag/drop file select simulation
    const dropzone = document.getElementById('scan-dropzone');
    const fileInput = document.getElementById('scan-file');

    dropzone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handlePantryPhotoUpload(e.target.files[0]);
        }
    });

    // Drag and drop events
    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            dropzone.style.borderColor = 'var(--accent-green)';
        }, false);
    });
    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            dropzone.style.borderColor = 'var(--border-color)';
            if (eventName === 'drop' && e.dataTransfer.files.length > 0) {
                handlePantryPhotoUpload(e.dataTransfer.files[0]);
            }
        }, false);
    });

    // Modal Closures
    document.getElementById('substitution-close').addEventListener('click', () => {
        document.getElementById('substitution-overlay').classList.remove('active');
    });
    document.getElementById('substitution-overlay').addEventListener('click', (e) => {
        if (e.target.id === 'substitution-overlay') {
            document.getElementById('substitution-overlay').classList.remove('active');
        }
    });
}

// Add user typed pantry item
function handleAddManualIngredient() {
    const input = document.getElementById('manual-ingredient-input');
    const value = input.value.trim().toLowerCase();
    if (value) {
        const list = value.split(',').map(x => x.trim()).filter(Boolean);
        list.forEach(item => {
            if (!state.onboarding.ingredients.includes(item)) {
                state.onboarding.ingredients.push(item);
            }
        });
        input.value = '';
        renderPantryChips();
    }
}

// Remove ingredient chip
function removeIngredient(item) {
    state.onboarding.ingredients = state.onboarding.ingredients.filter(x => x !== item);
    renderPantryChips();
}

// Render Pantry chips list
function renderPantryChips() {
    const container = document.getElementById('pantry-chips-container');
    container.innerHTML = '';

    if (state.onboarding.ingredients.length === 0) {
        container.innerHTML = `<span class="empty-hint" style="color: var(--text-secondary); font-size: 0.9rem; font-style: italic; margin: auto 0;">No active ingredients in list. Type above or scan.</span>`;
        return;
    }

    state.onboarding.ingredients.forEach(item => {
        const chip = document.createElement('div');
        chip.className = 'ingredient-chip';
        chip.innerHTML = `
      <span>${capitalize(item)}</span>
      <button aria-label="Delete ${item}">&times;</button>
    `;
        chip.querySelector('button').addEventListener('click', () => removeIngredient(item));
        container.appendChild(chip);
    });
}

// Conversational Scanner photo upload and base64 parsing
function handlePantryPhotoUpload(file) {
    const laserScanner = document.getElementById('laser-scanner');
    laserScanner.style.display = 'flex';

    const reader = new FileReader();
    reader.onload = async function () {
        const base64Data = reader.result.split(',')[1];
        const mimeType = file.type;

        if (state.apiKey) {
            try {
                const ingredients = await callGeminiVision(base64Data, mimeType);
                if (Array.isArray(ingredients)) {
                    // Merge scanned ingredients
                    ingredients.forEach(item => {
                        const clean = item.toLowerCase().trim();
                        if (!state.onboarding.ingredients.includes(clean)) {
                            state.onboarding.ingredients.push(clean);
                        }
                    });
                }
            } catch (err) {
                console.error(err);
                alert(`Gemini Vision Scan Error: ${err.message}. Cascading to demo food values.`);
                fallbackMockScan();
            } finally {
                laserScanner.style.display = 'none';
                renderPantryChips();
            }
        } else {
            // Mock scanner behavior (simulating delayed visual results)
            setTimeout(() => {
                fallbackMockScan();
                laserScanner.style.display = 'none';
                renderPantryChips();
            }, 2500);
        }
    };
    reader.readAsDataURL(file);
}

// Mock analysis response
function fallbackMockScan() {
    const defaults = ['eggs', 'rice', 'tomatoes', 'milk', 'butter'];
    defaults.forEach(item => {
        if (!state.onboarding.ingredients.includes(item)) {
            state.onboarding.ingredients.push(item);
        }
    });
}

// Direct Call to Gemini Multimodal Endpoint
async function callGeminiVision(base64Image, mimeType) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${state.apiKey}`;

    const requestBody = {
        contents: [
            {
                parts: [
                    {
                        text: "Extract every raw food ingredient visible in this pantry or smart fridge photo. Return a JSON array of strings containing just the lowercase ingredient names e.g. ['eggs', 'milk']. Do not return markdown. Do not include containers, boxes, or adjectives unless critical. Keep names raw."
                    },
                    {
                        inlineData: {
                            mimeType: mimeType,
                            data: base64Image
                        }
                    }
                ]
            }
        ],
        generationConfig: {
            responseMimeType: "application/json"
        }
    };

    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Vision Error: ${response.status} - ${errText}`);
    }

    const resData = await response.json();
    const textOut = resData.candidates[0].content.parts[0].text;
    return JSON.parse(textOut);
}

// Trigger hypno loading checklist sequence
function triggerPlanGeneration(forceDemo = false) {
    setScreen('screen-loading');
    state.activeReplacements = {}; // reset on generation

    const checkpoints = [
        { id: 'chk-planning', delay: 400 },
        { id: 'chk-pantry', delay: 1000 },
        { id: 'chk-schedule', delay: 1600 },
        { id: 'chk-nutrition', delay: 2200 },
        { id: 'chk-budget', delay: 2800 },
        { id: 'chk-waste', delay: 3400 },
        { id: 'chk-finalizing', delay: 4000 }
    ];

    // Reset checklist DOM status styling
    checkpoints.forEach(chk => {
        const el = document.getElementById(chk.id);
        el.className = 'checklist-item';
    });

    checkpoints.forEach((chk, index) => {
        setTimeout(() => {
            const el = document.getElementById(chk.id);
            el.classList.add('active');
            if (index > 0) {
                document.getElementById(checkpoints[index - 1].id).classList.replace('active', 'done');
            }
        }, chk.delay);
    });

    // Call API or mock
    const finalDelay = checkpoints[checkpoints.length - 1].delay + 1000;

    setTimeout(async () => {
        if (state.apiKey && !forceDemo) {
            try {
                await generatePlanViaGemini();
                renderDashboard();
                setScreen('screen-dashboard');
            } catch (err) {
                console.error(err);
                alert(`Gemini Generation Error: ${err.message}. Recovering in Demo Mode.`);
                loadMockPlan();
                renderDashboard();
                setScreen('screen-dashboard');
            }
        } else {
            loadMockPlan();
            renderDashboard();
            setScreen('screen-dashboard');
        }
    }, finalDelay);
}

// Generate Day Plan via Google Gemini Structured Outputs
async function generatePlanViaGemini() {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${state.apiKey}`;

    const promptText = `
    Create a personalized daily cooking plan for a user based on these inputs:
    - Activity Schedule status: ${state.onboarding.schedule} (represents complexity limits)
    - Craving vibe/mood: ${state.onboarding.vibes.join(', ')}
    - Daily Budget Limit: ₹${state.onboarding.budgets[state.onboarding.budgetIndex]} INR
    - Pantry Inventory available: ${state.onboarding.ingredients.join(', ')}

    Recommend 3 full meals (breakfast, lunch, dinner) and return a structured JSON response.
    Each meal recipe cost must fit within the daily budget (e.g. total combined cost of all meals must be less than/close to budget).
    Calculate estimated grocery prices in INR.
    Include a summary of money saved vs eating at a restaurant in INR.
    Include food waste prevented in kg/grams.
    
    For every meal, explain "whySelected" as a JSON array of raw strings. Make it context-specific.
    E.g. IF schedule is Busy, explain "takes only 15 minutes". If pantry contains eggs, explain "uses eggs already in house". If budget is ₹500, explain "costs only ₹110" or "reduces grocery spending by ₹x". 
    Do NOT use rigid templates; make them customized sentences.

    JSON Schema MUST MATCH EXACTLY:
    {
      "breakfast": {
        "name": "string",
        "ingredients": ["string"],
        "instructions": ["string"],
        "prepTime": "string",
        "cookTime": "string",
        "nutrients": { "calories": 100, "protein": "string", "carbs": "string", "fat": "string" },
        "cost": 100,
        "difficulty": "string (Easy/Medium/Hard)",
        "whySelected": ["string"]
      },
      "lunch": {
        "name": "string",
        "ingredients": ["string"],
        "instructions": ["string"],
        "prepTime": "string",
        "cookTime": "string",
        "nutrients": { "calories": 100, "protein": "string", "carbs": "string", "fat": "string" },
        "cost": 100,
        "difficulty": "string (Easy/Medium/Hard)",
        "whySelected": ["string"]
      },
      "dinner": {
        "name": "string",
        "ingredients": ["string"],
        "instructions": ["string"],
        "prepTime": "string",
        "cookTime": "string",
        "nutrients": { "calories": 100, "protein": "string", "carbs": "string", "fat": "string" },
        "cost": 100,
        "difficulty": "string (Easy/Medium/Hard)",
        "whySelected": ["string"]
      },
      "groceryList": [
        { "item": "string", "category": "string (Vegetables/Dairy/Protein/Spices)", "amount": "string", "estimatedCost": 100 }
      ],
      "budgetSummary": { "totalCost": 100, "currency": "INR", "status": "string" },
      "substitutions": [
        { "original": "string", "alternative": "string", "reason": "string" }
      ],
      "cookingTimeline": [
        { "time": "string", "action": "string" }
      ],
      "nutrition": { "calories": 100, "protein": "string", "carbs": "string", "fat": "string" },
      "reasoning": "string"
    }
  `;

    const requestBody = {
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: {
            responseMimeType: "application/json"
        }
    };

    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Generation API Error: ${response.status} - ${errText}`);
    }

    const resJson = await response.json();
    const rawText = resJson.candidates[0].content.parts[0].text;
    state.mealPlan = JSON.parse(rawText);
}

// Load Mock details tailored slightly to their selections
function loadMockPlan() {
    const plan = JSON.parse(JSON.stringify(mockPlans.default));

    // Customize mock values slightly based on user selections
    const selectedSchedule = state.onboarding.schedule || "Working";
    const limit = state.onboarding.budgets[state.onboarding.budgetIndex];

    plan.whySelected = [
        `optimized for ${selectedSchedule} baseline`,
        `fits strict ₹${limit} limit`,
    ];

    // Custom totals
    plan.budgetSummary.status = `Budget Goal: ₹${limit} • Actual Spent: ₹${plan.budgetSummary.totalCost}`;

    state.mealPlan = plan;
}

// Render Complete Concierge Dashboard HTML
function renderDashboard() {
    if (!state.mealPlan) return;
    const plan = state.mealPlan;

    // Render header context description
    const scheduleStr = state.onboarding.schedule || "Demo";
    const vibesStr = state.onboarding.vibes.length > 0 ? state.onboarding.vibes.join(' & ') : "Balanced";
    document.getElementById('dashboard-subtitle-text').textContent = `${scheduleStr} Day • Craving: ${vibesStr} • Cap: ₹${state.onboarding.budgets[state.onboarding.budgetIndex]}`;

    // Render Meals
    const mealsGrid = document.getElementById('meals-grid-container');
    mealsGrid.innerHTML = '';

    const types = ['breakfast', 'lunch', 'dinner'];
    types.forEach(type => {
        const meal = plan[type];

        // Custom curated minimalist Unsplash photography tags
        let photoUrl = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=60'; // Salad
        if (type === 'breakfast') {
            photoUrl = 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=500&auto=format&fit=crop&q=60'; // Eggs/Avocado toast
        } else if (type === 'lunch') {
            photoUrl = 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=500&auto=format&fit=crop&q=60'; // bowl / ramen
        } else if (type === 'dinner') {
            photoUrl = 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500&auto=format&fit=crop&q=60'; // Warm plate veggies
        }

        const card = document.createElement('div');
        card.className = 'meal-card';
        card.setAttribute('data-meal', type);

        // Assemble "Why Selected" text bullets
        let whyLi = '';
        if (meal.whySelected && meal.whySelected.length > 0) {
            meal.whySelected.forEach(why => {
                whyLi += `<li>${why}</li>`;
            });
        } else {
            whyLi = `<li>Selected to optimize your budget and time</li>`;
        }

        // Replace ingredient references if dynamic substitutions happened
        const renderedIngredients = meal.ingredients.map(ing => {
            const repKey = `${type}_${ing.toLowerCase()}`;
            const rep = state.activeReplacements[repKey];
            if (rep) {
                return `<span class="recipe-ingredient-name" style="text-decoration: line-through; opacity: 0.6;">${ing}</span>
                <span class="recipe-ingredient-name text-green"> &rarr; ${rep.name}</span>
                <button class="sub-replace-btn" onclick="openSubstitutionModal('${type}', '${ing}')">Replace</button>`;
            }
            return `<span class="recipe-ingredient-name">${ing}</span>
              <button class="sub-replace-btn" onclick="openSubstitutionModal('${type}', '${ing}')">Replace</button>`;
        });

        const isCollapsed = true;

        card.innerHTML = `
      <div class="meal-visual">
        <span class="meal-type-badge">${type}</span>
        <img src="${photoUrl}" alt="${meal.name}" class="meal-photo">
      </div>
      
      <div class="meal-info">
        <h3 class="meal-title">${meal.name}</h3>
        
        <div class="meal-stats">
          <div class="meal-stat-item">
            <span class="meal-stat-label">Prep / Cook</span>
            <span class="meal-stat-value">${meal.prepTime} / ${meal.cookTime}</span>
          </div>
          <div class="meal-stat-item">
            <span class="meal-stat-label">Cost</span>
            <span class="meal-stat-value">₹${meal.cost}</span>
          </div>
          <div class="meal-stat-item">
            <span class="meal-stat-label">Protein / Calories</span>
            <span class="meal-stat-value">${meal.nutrients.protein} / ${meal.nutrients.calories} kcal</span>
          </div>
          <div class="meal-stat-item">
            <span class="meal-stat-label">Difficulty</span>
            <span class="meal-stat-value">${meal.difficulty}</span>
          </div>
        </div>

        <div class="meal-reasons">
          <h4 class="meal-reasons-title">Why Selected</h4>
          <ul class="meal-reasons-list">
            ${whyLi}
          </ul>
        </div>

        <button class="btn-expand-steps mt-auto">See Recipe Steps</button>
        
        <div class="expanded-recipe">
          <div class="recipe-content-box animate-fade-in">
            <div class="recipe-section-header">Ingredients</div>
            <div class="ingredients-list-grid">
              ${renderedIngredients.map(html => `<div class="recipe-ingredient-row">${html}</div>`).join('')}
            </div>
            
            <div class="recipe-section-header">Cooking Instructions</div>
            <div class="steps-list">
              ${meal.instructions.map((step, idx) => `
                <div class="step-row">
                  <span class="step-num">${String(idx + 1).padStart(2, '0')}</span>
                  <p class="step-text">${step}</p>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;

        // See script steps action
        const expandBtn = card.querySelector('.btn-expand-steps');
        const expandedArea = card.querySelector('.expanded-recipe');
        expandBtn.addEventListener('click', () => {
            const active = expandedArea.classList.toggle('active');
            expandBtn.textContent = active ? 'Hide Recipe Steps' : 'See Recipe Steps';
        });

        mealsGrid.appendChild(card);
    });

    // Calculate dynamic stats
    let totalCost = 0;
    let totalProtein = 0;
    let totalCalories = 0;

    types.forEach(type => {
        const meal = plan[type];
        totalCost += meal.cost;
        totalProtein += parseFloat(meal.nutrients.protein) || 0;
        totalCalories += parseFloat(meal.nutrients.calories) || 0;
    });

    // Apply substitutions delta cost adjustments
    Object.keys(state.activeReplacements).forEach(key => {
        const rep = state.activeReplacements[key];
        const diff = parseInt(rep.costDifference.replace('₹', '').trim().replace('+', '')) || 0;
        if (rep.costDifference.includes('-')) {
            totalCost -= Math.abs(diff);
        } else {
            totalCost += diff;
        }
    });

    // Update Summary Stats DOM
    document.getElementById('stat-max-budget').textContent = `₹${state.onboarding.budgets[state.onboarding.budgetIndex]}`;
    document.getElementById('stat-est-cost').textContent = `₹${totalCost}`;

    const savedVal = Math.max(0, 1000 - totalCost); // assuming restaurant benchmark of ₹1000/day
    document.getElementById('stat-money-saved').textContent = `₹${savedVal}`;

    // Waste prevented
    const activeCount = state.onboarding.ingredients.length;
    const waste = (activeCount * 0.25).toFixed(1); // 250g per pantry ingredient
    document.getElementById('stat-waste-prevented').textContent = `${waste} kg`;

    document.getElementById('stat-protein-total').textContent = `${Math.round(totalProtein)}g`;
    document.getElementById('stat-calories-total').textContent = `${Math.round(totalCalories)} kcal`;

    // Reasoning text
    document.getElementById('dashboard-reasoning-text').textContent = plan.reasoning ||
        `Plan optimized dynamically around schedule constraints and inventory. Sourced items locally to balance caloric need and limit spending.`;

    // Render Grocery Dashboard splits
    renderGroceryList();
}

// Render Grocery Checklist columns divided dynamically
function renderGroceryList() {
    if (!state.mealPlan) return;
    const plan = state.mealPlan;

    const buyListContainer = document.getElementById('grocery-buy-list');
    const haveListContainer = document.getElementById('grocery-have-list');

    buyListContainer.innerHTML = '';
    haveListContainer.innerHTML = '';

    // Consolidate ingredient demands from all meals
    const allNeededIngredients = [];
    const types = ['breakfast', 'lunch', 'dinner'];

    types.forEach(type => {
        const meal = plan[type];
        meal.ingredients.forEach(rawIng => {
            // Check if substitution replaced this
            const repKey = `${type}_${rawIng.toLowerCase()}`;
            const rep = state.activeReplacements[repKey];
            const targetName = rep ? rep.name : rawIng;
            if (!allNeededIngredients.includes(targetName)) {
                allNeededIngredients.push(targetName);
            }
        });
    });

    // Categorize variables dynamically
    // If API return groceryList item entries, merge them, otherwise map defaults
    let finalGroceryDemands = [];
    if (plan.groceryList && plan.groceryList.length > 0) {
        plan.groceryList.forEach(g => {
            // check context of substitution names
            let matchName = g.item;
            // check if any active substitutions match original
            Object.keys(state.activeReplacements).forEach(subK => {
                const parts = subK.split('_');
                if (parts[1] === g.item.toLowerCase()) {
                    matchName = state.activeReplacements[subK].name;
                }
            });
            finalGroceryDemands.push({
                name: matchName,
                category: g.category || 'Vegetables',
                amount: g.amount || 'As needed',
                cost: g.estimatedCost || 30
            });
        });
    } else {
        // Generate fallback listings
        allNeededIngredients.forEach((ing, i) => {
            const category = guessCategory(ing);
            const isPantry = state.onboarding.ingredients.includes(ing.toLowerCase());
            finalGroceryDemands.push({
                name: ing,
                category: category,
                amount: '1 unit',
                cost: isPantry ? 0 : 35 + (i * 5) % 80
            });
        });
    }

    // Group by Already Have vs Need to Buy
    // Pantry matches are placed in Already Have, everything else is Need to Buy
    const needToBuy = [];
    const alreadyHave = [];

    finalGroceryDemands.forEach(item => {
        const nameLower = item.name.toLowerCase();
        const possessed = state.onboarding.ingredients.some(pi => pi.toLowerCase() === nameLower || nameLower.includes(pi.toLowerCase()));

        if (possessed) {
            alreadyHave.push(item);
        } else {
            needToBuy.push(item);
        }
    });

    // Update counts
    document.getElementById('grocery-buy-count').textContent = needToBuy.length;
    document.getElementById('grocery-have-count').textContent = alreadyHave.length;

    // Calculate bill total from Need to Buy items
    let totalBill = 0;
    needToBuy.forEach(item => {
        totalBill += item.cost;
    });
    document.getElementById('grocery-total-bill').textContent = `₹${totalBill}`;

    // Render "Need to Buy" Grouped by Category
    const categories = ['Vegetables', 'Dairy', 'Protein', 'Spices'];
    categories.forEach(cat => {
        const catItems = needToBuy.filter(x => x.category === cat);
        if (catItems.length === 0) return;

        const group = document.createElement('div');
        group.className = 'grocery-cat-group';
        group.innerHTML = `<h4 class="grocery-cat-title">${cat}</h4>`;

        catItems.forEach(item => {
            const row = document.createElement('div');
            row.className = 'grocery-item-row';
            row.innerHTML = `
        <input type="checkbox" class="grocery-checkbox" aria-label="Mark ${item.name} as purchased">
        <div class="grocery-item-label">
          <span class="grocery-item-name">${item.name}</span>
          <span class="grocery-item-price">${item.amount} • ₹${item.cost}</span>
        </div>
      `;
            // Checkbox event toggles ingredient item to possessed, updating board
            row.querySelector('.grocery-checkbox').addEventListener('change', () => {
                state.onboarding.ingredients.push(item.name.toLowerCase());
                renderDashboard(); // re-render layout
            });
            group.appendChild(row);
        });

        buyListContainer.appendChild(group);
    });

    // Render "Already Have" List
    if (alreadyHave.length === 0) {
        haveListContainer.innerHTML = `<span style="color: var(--text-secondary); font-size: 0.85rem; font-style: italic;">Pantry empty. Check buy list to stock.</span>`;
    } else {
        alreadyHave.forEach(item => {
            const row = document.createElement('div');
            row.className = 'grocery-item-row';
            row.innerHTML = `
        <input type="checkbox" class="grocery-checkbox" checked aria-label="Mark ${item.name} as needed for buy list">
        <div class="grocery-item-label">
          <span class="grocery-item-name">${item.name}</span>
          <span class="grocery-item-price">In Pantry</span>
        </div>
      `;
            row.querySelector('.grocery-checkbox').addEventListener('change', () => {
                state.onboarding.ingredients = state.onboarding.ingredients.filter(x => x !== item.name.toLowerCase());
                renderDashboard(); // re-render layout
            });
            haveListContainer.appendChild(row);
        });
    }
}

// Category helper guesser
function guessCategory(name) {
    const norm = name.toLowerCase();
    if (norm.includes('egg') || norm.includes('chicken') || norm.includes('salmon') || norm.includes('meat') || norm.includes('fish') || norm.includes('tofu')) {
        return 'Protein';
    }
    if (norm.includes('milk') || norm.includes('butter') || norm.includes('cheese') || norm.includes('cream') || norm.includes('paneer') || norm.includes('curd')) {
        return 'Dairy';
    }
    if (norm.includes('onion') || norm.includes('garlic') || norm.includes('tomato') || norm.includes('pepper') || norm.includes('cabbage') || norm.includes('spinach') || norm.includes('veggie') || norm.includes('greens')) {
        return 'Vegetables';
    }
    return 'Spices'; // default bucket
}

// AI Substitution Engine Dialog trigger
let currentActiveSub = null; // tracks { mealType, ingredientName }
async function openSubstitutionModal(mealType, ingredientName) {
    currentActiveSub = { mealType, ingredientName };

    const modal = document.getElementById('substitution-overlay');
    modal.classList.add('active');

    document.getElementById('sub-target-ingredient').textContent = capitalize(ingredientName);

    const loading = document.getElementById('sub-loading');
    const results = document.getElementById('sub-results');

    loading.style.display = 'flex';
    results.style.display = 'none';

    if (state.apiKey) {
        try {
            const prompt = `
        Provide culinary replacements for "${ingredientName}" in the context of the recipe meal "${state.mealPlan[mealType].name}".
        Consider availability in household, taste match similarity percentage, cost difference compared to "${ingredientName}", and fit for a ${state.onboarding.vibes.join('/') || 'healthy'} diet.
        
        Output MUST be valid JSON array of objects structured as:
        [
          {
            "name": "Alternative ingredient name",
            "costDifference": "string (e.g. +₹10, -₹20, or neutral)",
            "tasteMatchPercent": 85,
            "reason": "Clear concise reason that makes sense culinary-wise."
          }
        ]
      `;
            const res = await callGeminiSubstitutions(prompt);
            renderSubResults(res);
        } catch (err) {
            console.error(err);
            alert(`Substitution Error: ${err.message}. Showing default alternatives.`);
            renderSubResults(mockSubstitutions[ingredientName.toLowerCase()] || mockSubstitutions.default);
        }
    } else {
        // Mock substitutions load
        setTimeout(() => {
            const candidates = mockSubstitutions[ingredientName.toLowerCase()] || mockSubstitutions.default;
            renderSubResults(candidates);
        }, 1500);
    }
}

// Call Gemini for replacement options
async function callGeminiSubstitutions(prompt) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${state.apiKey}`;
    const requestBody = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
            responseMimeType: "application/json"
        }
    };

    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Substitutions Error: ${response.status} - ${errText}`);
    }

    const resJson = await response.json();
    const rawText = resJson.candidates[0].content.parts[0].text;
    return JSON.parse(rawText);
}

// Render replacement alternatives inside modal list
function renderSubResults(alternatives) {
    const loading = document.getElementById('sub-loading');
    const results = document.getElementById('sub-results');

    loading.style.display = 'none';
    results.style.display = 'flex';
    results.innerHTML = '';

    if (!Array.isArray(alternatives) || alternatives.length === 0) {
        results.innerHTML = `<span style="color: var(--text-secondary); text-align: center; margin: 15px auto;">No suitable substitutes found.</span>`;
        return;
    }

    alternatives.forEach(alt => {
        const card = document.createElement('div');
        card.className = 'sub-card';

        const costClass = alt.costDifference.includes('-') ? 'cost-down text-green' : (alt.costDifference.includes('+') ? 'cost-up' : '');

        card.innerHTML = `
      <div class="sub-card-header">
        <span class="sub-card-title">${alt.name}</span>
        <div class="sub-card-meta">
          <span class="sub-diff-cost ${costClass}">${alt.costDifference}</span>
          <span class="sub-match-percent">${alt.tasteMatchPercent}% match</span>
        </div>
      </div>
      <p class="sub-card-reason">${alt.reason}</p>
    `;

        // Swap ingredient triggers state rewrite and rendering updates
        card.addEventListener('click', () => {
            const key = `${currentActiveSub.mealType}_${currentActiveSub.ingredientName.toLowerCase()}`;
            state.activeReplacements[key] = alt;

            // Close modal
            document.getElementById('substitution-overlay').classList.remove('active');

            // Redraw dashboard to reflect updated replacement
            renderDashboard();
        });

        results.appendChild(card);
    });
}

// Helper: capitalize string words
function capitalize(str) {
    return str.split(' ').map(w => w.charAt(0).toUpperCase() + w.substr(1)).join(' ');
}
