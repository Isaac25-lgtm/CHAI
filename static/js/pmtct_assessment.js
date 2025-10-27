/**
 * PMTCT Assessment Tool - Frontend JavaScript
 * Handles the dynamic rendering and interaction of the comprehensive PMTCT assessment
 */

// Store assessment responses and calculated values
const assessmentData = {
    responses: {},
    calculations: {},
    scores: {},
    comments: {}
};

// Color scoring map
const scoreColors = {
    'red': { label: 'Red', value: 1, color: '#dc3545' },
    'yellow': { label: 'Yellow', value: 2, color: '#ffc107' },
    'light_green': { label: 'Light Green', value: 3, color: '#90EE90' },
    'dark_green': { label: 'Dark Green', value: 4, color: '#28a745' },
    'green': { label: 'Green', value: 3.5, color: '#28a745' }
};

/**
 * Initialize the PMTCT assessment interface
 */
function initializePMTCTAssessment() {
    renderPMTCTSections();
    attachEventListeners();
}

/**
 * Render all PMTCT assessment sections
 */
function renderPMTCTSections() {
    const container = document.getElementById('pmtctAssessmentSections');
    if (!container) {
        console.error('PMTCT Assessment container not found');
        return;
    }

    let html = '<div class="pmtct-assessment-wrapper">';
    html += '<h2>SECTION 4: PMTCT Assessment</h2>';
    html += '<p class="assessment-intro">Comprehensive PMTCT assessment covering HIV, Syphilis, and Hepatitis B services for pregnant women and HIV-exposed infants.</p>';

    // Load sections from the configuration (this would be passed from the backend)
    // For now, we'll create a modular structure that can handle different question types
    
    html += '<div id="pmtct-sections-container"></div>';
    html += '</div>';

    container.innerHTML = html;
}

/**
 * Render a specific section based on its type
 */
function renderSection(section) {
    let html = `
        <div class="pmtct-section card" id="section-${section.id}">
            <div class="section-header">
                <h3>${section.title}</h3>
                ${section.standard ? `<p class="section-standard"><strong>STANDARD:</strong> ${section.standard}</p>` : ''}
                ${section.instructions ? `<p class="section-instructions"><strong>Instructions:</strong> ${section.instructions}</p>` : ''}
                ${section.note ? `<p class="section-note"><strong>Note:</strong> ${section.note}</p>` : ''}
            </div>
            <div class="section-body">
    `;

    // Render NA option if applicable
    if (section.na_option) {
        html += `
            <div class="na-option">
                <label>
                    <input type="checkbox" id="na-${section.id}" onchange="handleNASelection('${section.id}')">
                    Not Applicable (Skip this section)
                </label>
            </div>
        `;
    }

    // Render questions
    html += '<div class="questions-container" id="questions-' + section.id + '">';
    section.questions.forEach(question => {
        html += renderQuestion(question, section.id);
    });
    html += '</div>';

    html += `
            </div>
            <div class="section-score">
                <strong>Section Score:</strong> <span id="score-${section.id}">Not scored</span>
            </div>
            <div class="section-comment">
                <label for="comment-${section.id}">Section Comments:</label>
                <textarea id="comment-${section.id}" rows="3" placeholder="Additional comments for this section..."></textarea>
            </div>
        </div>
    `;

    return html;
}

/**
 * Render a question based on its type
 */
function renderQuestion(question, sectionId) {
    const questionId = question.id;
    let html = `
        <div class="question-item" id="question-${questionId}" data-depends-on='${JSON.stringify(question.depends_on || {})}'>
            <div class="question-text">
                <strong>Q${question.id.split('_q')[1]}:</strong> ${question.text}
            </div>
    `;

    // Render based on question type
    switch (question.type) {
        case 'yes_no':
            html += renderYesNo(questionId);
            break;
        case 'multi_yes_no':
            html += renderMultiYesNo(questionId, question.items);
            break;
        case 'yes_no_with_text':
            html += renderYesNoWithText(questionId, question.additional_text);
            break;
        case 'number_input':
            html += renderNumberInput(questionId);
            break;
        case 'percentage_input':
            html += renderPercentageInput(questionId);
            break;
        case 'text_input':
            html += renderTextInput(questionId, question.placeholder);
            break;
        case 'text_area':
            html += renderTextArea(questionId, question.placeholder);
            break;
        case 'radio':
            html += renderRadio(questionId, question.options);
            break;
        case 'multi_checkbox':
            html += renderMultiCheckbox(questionId, question.options || question.items);
            break;
        case 'data_entry_table':
            html += renderDataEntryTable(questionId, question.fields);
            break;
        case 'chart_review_table':
            html += renderChartReviewTable(questionId, question.services, question.charts);
            break;
        case 'checklist_table':
            html += renderChecklistTable(questionId, question.columns, question.items);
            break;
    }

    // Add note if present
    if (question.note) {
        html += `<p class="question-note"><em>${question.note}</em></p>`;
    }

    // Add instructions if present
    if (question.instructions) {
        html += `<p class="question-instructions"><em>${question.instructions}</em></p>`;
    }

    html += '</div>';
    return html;
}

/**
 * Render Yes/No question
 */
function renderYesNo(questionId) {
    return `
        <div class="response-options">
            <label>
                <input type="radio" name="${questionId}" value="yes" onchange="handleResponse('${questionId}', 'yes')">
                Yes
            </label>
            <label>
                <input type="radio" name="${questionId}" value="no" onchange="handleResponse('${questionId}', 'no')">
                No
            </label>
        </div>
    `;
}

/**
 * Render Multiple Yes/No question (for items list)
 */
function renderMultiYesNo(questionId, items) {
    let html = '<div class="multi-yes-no">';
    items.forEach((item, index) => {
        const itemId = `${questionId}_${index}`;
        html += `
            <div class="multi-item">
                <span class="item-label">${item}</span>
                <label>
                    <input type="radio" name="${itemId}" value="yes" onchange="handleMultiYesNo('${questionId}')">
                    Yes
                </label>
                <label>
                    <input type="radio" name="${itemId}" value="no" onchange="handleMultiYesNo('${questionId}')">
                    No
                </label>
            </div>
        `;
    });
    html += '</div>';
    return html;
}

/**
 * Render Yes/No with additional text field
 */
function renderYesNoWithText(questionId, additionalText) {
    return `
        <div class="response-options">
            <label>
                <input type="radio" name="${questionId}" value="yes" onchange="handleResponse('${questionId}', 'yes')">
                Yes
            </label>
            <label>
                <input type="radio" name="${questionId}" value="no" onchange="handleResponse('${questionId}', 'no')">
                No
            </label>
        </div>
        <div class="additional-text">
            <label>${additionalText}</label>
            <textarea id="${questionId}_text" rows="3" placeholder="Enter details..."></textarea>
        </div>
    `;
}

/**
 * Render Number input
 */
function renderNumberInput(questionId) {
    return `
        <div class="number-input">
            <input type="number" id="${questionId}_value" min="0" placeholder="Enter number" onchange="handleNumberInput('${questionId}')">
        </div>
    `;
}

/**
 * Render Percentage input
 */
function renderPercentageInput(questionId) {
    return `
        <div class="percentage-input">
            <input type="number" id="${questionId}_value" min="0" max="100" step="0.1" placeholder="Enter percentage" onchange="handlePercentageInput('${questionId}')">
            <span>%</span>
        </div>
    `;
}

/**
 * Render Text input
 */
function renderTextInput(questionId, placeholder = '') {
    return `
        <div class="text-input">
            <input type="text" id="${questionId}_value" placeholder="${placeholder}" onchange="handleTextInput('${questionId}')">
        </div>
    `;
}

/**
 * Render Text area
 */
function renderTextArea(questionId, placeholder = '') {
    return `
        <div class="text-area">
            <textarea id="${questionId}_value" rows="4" placeholder="${placeholder}" onchange="handleTextArea('${questionId}')"></textarea>
        </div>
    `;
}

/**
 * Render Radio buttons
 */
function renderRadio(questionId, options) {
    let html = '<div class="radio-options">';
    options.forEach((option, index) => {
        html += `
            <label>
                <input type="radio" name="${questionId}" value="${option}" onchange="handleResponse('${questionId}', '${option}')">
                ${option}
            </label>
        `;
    });
    html += '</div>';
    return html;
}

/**
 * Render Multi-checkbox
 */
function renderMultiCheckbox(questionId, options) {
    let html = '<div class="checkbox-options">';
    options.forEach((option, index) => {
        const optionId = `${questionId}_${index}`;
        html += `
            <label>
                <input type="checkbox" id="${optionId}" value="${option}" onchange="handleMultiCheckbox('${questionId}')">
                ${option}
            </label>
        `;
    });
    html += '</div>';
    return html;
}

/**
 * Render Data Entry Table
 */
function renderDataEntryTable(questionId, fields) {
    let html = '<div class="data-entry-table"><table><thead><tr><th>Item</th><th>Value</th></tr></thead><tbody>';
    
    fields.forEach(field => {
        html += `
            <tr>
                <td>${field.label}</td>
                <td>
        `;
        
        if (field.type === 'calculated') {
            html += `<input type="text" id="${questionId}_${field.id}" class="calculated-field" readonly placeholder="Auto-calculated">`;
        } else if (field.type === 'number') {
            html += `<input type="number" id="${questionId}_${field.id}" min="0" onchange="handleDataEntry('${questionId}', '${field.id}')">`;
        }
        
        html += `
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table></div>';
    return html;
}

/**
 * Render Chart Review Table
 */
function renderChartReviewTable(questionId, services, chartCount) {
    let html = '<div class="chart-review-table"><table class="chart-table"><thead><tr><th>Service</th>';
    
    // Create headers for each chart
    for (let i = 1; i <= chartCount; i++) {
        html += `<th>${i}</th>`;
    }
    html += '<th>% Score</th></tr></thead><tbody>';
    
    services.forEach((service, sIndex) => {
        html += `<tr><td>${service}</td>`;
        for (let i = 1; i <= chartCount; i++) {
            html += `
                <td>
                    <select id="${questionId}_s${sIndex}_c${i}" onchange="handleChartReview('${questionId}')">
                        <option value="">-</option>
                        <option value="Y">Y</option>
                        <option value="N">N</option>
                        <option value="NA">NA</option>
                    </select>
                </td>
            `;
        }
        html += `<td><span id="${questionId}_score_s${sIndex}">0%</span></td></tr>`;
    });
    
    html += '</tbody></table></div>';
    return html;
}

/**
 * Render Checklist Table
 */
function renderChecklistTable(questionId, columns, items) {
    let html = '<div class="checklist-table"><table><thead><tr>';
    columns.forEach(col => {
        html += `<th>${col}</th>`;
    });
    html += '<th>Score</th></tr></thead><tbody>';
    
    items.forEach((item, index) => {
        html += `<tr><td>${item}</td>`;
        // Add Yes/No for each of the 3 criteria columns
        for (let i = 1; i < columns.length; i++) {
            html += `
                <td>
                    <label><input type="radio" name="${questionId}_item${index}_col${i}" value="Y"> Y</label>
                    <label><input type="radio" name="${questionId}_item${index}_col${i}" value="N"> N</label>
                </td>
            `;
        }
        html += `<td><span id="${questionId}_score_${index}" class="score-indicator">-</span></td></tr>`;
    });
    
    html += '</tbody></table></div>';
    return html;
}

/**
 * Handle NA selection (Skip section)
 */
function handleNASelection(sectionId) {
    const checkbox = document.getElementById(`na-${sectionId}`);
    const questionsContainer = document.getElementById(`questions-${sectionId}`);
    
    if (checkbox.checked) {
        questionsContainer.style.display = 'none';
        document.getElementById(`score-${sectionId}`).textContent = 'N/A';
    } else {
        questionsContainer.style.display = 'block';
        document.getElementById(`score-${sectionId}`).textContent = 'Not scored';
    }
}

/**
 * Handle basic response (Yes/No, Radio)
 */
function handleResponse(questionId, value) {
    assessmentData.responses[questionId] = value;
    checkConditionalQuestions();
    calculateScore(questionId);
}

/**
 * Handle multi yes/no responses
 */
function handleMultiYesNo(questionId) {
    // Collect all responses for this multi-question
    const responses = {};
    const inputs = document.querySelectorAll(`input[name^="${questionId}_"]:checked`);
    inputs.forEach(input => {
        const key = input.name;
        responses[key] = input.value;
    });
    assessmentData.responses[questionId] = responses;
    calculateScore(questionId);
}

/**
 * Handle number input
 */
function handleNumberInput(questionId) {
    const value = document.getElementById(`${questionId}_value`).value;
    assessmentData.responses[questionId] = parseInt(value);
    calculateScore(questionId);
}

/**
 * Handle percentage input
 */
function handlePercentageInput(questionId) {
    const value = document.getElementById(`${questionId}_value`).value;
    assessmentData.responses[questionId] = parseFloat(value);
    calculateScore(questionId);
}

/**
 * Handle text input
 */
function handleTextInput(questionId) {
    const value = document.getElementById(`${questionId}_value`).value;
    assessmentData.responses[questionId] = value;
}

/**
 * Handle text area
 */
function handleTextArea(questionId) {
    const value = document.getElementById(`${questionId}_value`).value;
    assessmentData.responses[questionId] = value;
}

/**
 * Handle multi-checkbox
 */
function handleMultiCheckbox(questionId) {
    const checked = [];
    const checkboxes = document.querySelectorAll(`input[id^="${questionId}_"]:checked`);
    checkboxes.forEach(cb => {
        checked.push(cb.value);
    });
    assessmentData.responses[questionId] = checked;
}

/**
 * Handle data entry in tables
 */
function handleDataEntry(questionId, fieldId) {
    const value = document.getElementById(`${questionId}_${fieldId}`).value;
    if (!assessmentData.responses[questionId]) {
        assessmentData.responses[questionId] = {};
    }
    assessmentData.responses[questionId][fieldId] = parseFloat(value) || 0;
    
    // Trigger calculations for calculated fields
    calculateTableValues(questionId);
}

/**
 * Calculate values in data entry tables
 */
function calculateTableValues(questionId) {
    // This would contain logic to perform calculations based on formulas
    // For now, placeholder
    console.log('Calculating values for', questionId);
}

/**
 * Handle chart review table responses
 */
function handleChartReview(questionId) {
    // Calculate percentages for each service
    console.log('Chart review updated for', questionId);
}

/**
 * Check and show/hide conditional questions
 */
function checkConditionalQuestions() {
    const allQuestions = document.querySelectorAll('.question-item[data-depends-on]');
    allQuestions.forEach(question => {
        const dependsOn = JSON.parse(question.dataset.dependsOn);
        let shouldShow = true;
        
        for (const [dependentQ, requiredValue] of Object.entries(dependsOn)) {
            if (assessmentData.responses[dependentQ] !== requiredValue) {
                shouldShow = false;
                break;
            }
        }
        
        question.style.display = shouldShow ? 'block' : 'none';
    });
}

/**
 * Calculate score for a question
 */
function calculateScore(questionId) {
    // This would contain the scoring logic based on the question's scoring rules
    // For now, placeholder
    console.log('Calculating score for', questionId);
}

/**
 * Attach event listeners
 */
function attachEventListeners() {
    // Add listeners for form submission, validation, etc.
}

/**
 * Validate assessment before submission
 */
function validatePMTCTAssessment() {
    // Validation logic
    return true;
}

/**
 * Get assessment data for submission
 */
function getPMTCTAssessmentData() {
    return {
        responses: assessmentData.responses,
        calculations: assessmentData.calculations,
        scores: assessmentData.scores,
        comments: assessmentData.comments
    };
}

// Export functions for use in main tools page
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initializePMTCTAssessment,
        getPMTCTAssessmentData,
        validatePMTCTAssessment
    };
}


