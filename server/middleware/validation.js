const { body, param, query, validationResult } = require('express-validator');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// Common validation rules
const validateId = [
  param('id').isInt({ min: 1 }).withMessage('ID must be a positive integer')
];

const validatePagination = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
];

// Pen validation
const validatePen = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Pen name must be between 1 and 100 characters'),
  body('capacity')
    .isInt({ min: 1, max: 1000 })
    .withMessage('Capacity must be between 1 and 1000'),
  body('species')
    .isIn(['cattle', 'goat', 'sheep', 'pig', 'chicken'])
    .withMessage('Species must be one of: cattle, goat, sheep, pig, chicken'),
  body('location')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Location must be less than 255 characters')
];

// Pen assignment validation
const validatePenAssignment = [
  body('pen_id')
    .isInt({ min: 1 })
    .withMessage('Pen ID must be a positive integer'),
  body('attendant_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Attendant ID must be a positive integer'),
  body('supervisor_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Supervisor ID must be a positive integer'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes must be less than 500 characters')
];

// Weight record validation
const validateWeightRecord = [
  body('animal_id')
    .isInt({ min: 1 })
    .withMessage('Animal ID must be a positive integer'),
  body('weight_kg')
    .isFloat({ min: 0.1, max: 2000 })
    .withMessage('Weight must be between 0.1 and 2000 kg'),
  body('date_recorded')
    .isISO8601()
    .withMessage('Date recorded must be a valid date'),
  body('body_condition_score')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Body condition score must be between 1 and 5'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes must be less than 500 characters')
];

// Breeding event validation
const validateBreedingEvent = [
  body('female_id')
    .isInt({ min: 1 })
    .withMessage('Female ID must be a positive integer'),
  body('male_id')
    .isInt({ min: 1 })
    .withMessage('Male ID must be a positive integer'),
  body('breeding_method')
    .isIn(['natural', 'artificial_insemination'])
    .withMessage('Breeding method must be either natural or artificial_insemination'),
  body('service_date')
    .isISO8601()
    .withMessage('Service date must be a valid date'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes must be less than 500 characters')
];

// Pregnancy check validation
const validatePregnancyCheck = [
  body('breeding_event_id')
    .isInt({ min: 1 })
    .withMessage('Breeding event ID must be a positive integer'),
  body('female_id')
    .isInt({ min: 1 })
    .withMessage('Female ID must be a positive integer'),
  body('check_date')
    .isISO8601()
    .withMessage('Check date must be a valid date'),
  body('result')
    .isIn(['pregnant', 'not_pregnant', 'uncertain'])
    .withMessage('Result must be pregnant, not_pregnant, or uncertain'),
  body('method')
    .optional()
    .isIn(['palpation', 'ultrasound', 'visual'])
    .withMessage('Method must be palpation, ultrasound, or visual'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes must be less than 500 characters')
];

// Birth validation
const validateBirth = [
  body('breeding_event_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Breeding event ID must be a positive integer'),
  body('dam_id')
    .isInt({ min: 1 })
    .withMessage('Dam ID must be a positive integer'),
  body('sire_id')
    .isInt({ min: 1 })
    .withMessage('Sire ID must be a positive integer'),
  body('birth_date')
    .isISO8601()
    .withMessage('Birth date must be a valid date'),
  body('birth_weight')
    .optional()
    .isFloat({ min: 0.1, max: 100 })
    .withMessage('Birth weight must be between 0.1 and 100 kg'),
  body('offspring_count')
    .isInt({ min: 1, max: 10 })
    .withMessage('Offspring count must be between 1 and 10'),
  body('complications')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Complications must be less than 500 characters')
];

// Vaccination validation
const validateVaccination = [
  body('animal_id')
    .isInt({ min: 1 })
    .withMessage('Animal ID must be a positive integer'),
  body('vaccine_type')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Vaccine type must be between 1 and 100 characters'),
  body('date_administered')
    .isISO8601()
    .withMessage('Date administered must be a valid date'),
  body('next_due_date')
    .optional()
    .isISO8601()
    .withMessage('Next due date must be a valid date'),
  body('batch_number')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Batch number must be less than 50 characters')
];

// Treatment validation
const validateTreatment = [
  body('animal_id')
    .isInt({ min: 1 })
    .withMessage('Animal ID must be a positive integer'),
  body('diagnosis')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Diagnosis must be between 1 and 200 characters'),
  body('drug_name')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Drug name must be less than 100 characters'),
  body('treatment_date')
    .isISO8601()
    .withMessage('Treatment date must be a valid date'),
  body('withdrawal_date')
    .optional()
    .isISO8601()
    .withMessage('Withdrawal date must be a valid date'),
  body('cost')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Cost must be a positive number')
];

// Mortality validation
const validateMortality = [
  body('animal_id')
    .isInt({ min: 1 })
    .withMessage('Animal ID must be a positive integer'),
  body('cause_of_death')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Cause of death must be between 1 and 200 characters'),
  body('date_of_death')
    .isISO8601()
    .withMessage('Date of death must be a valid date'),
  body('disposal_method')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Disposal method must be less than 100 characters')
];

// Feed ration validation
const validateFeedRation = [
  body('pen_id')
    .isInt({ min: 1 })
    .withMessage('Pen ID must be a positive integer'),
  body('ration_name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Ration name must be between 1 and 100 characters'),
  body('composition')
    .isObject()
    .withMessage('Composition must be a valid JSON object'),
  body('effective_from')
    .optional()
    .isISO8601()
    .withMessage('Effective from must be a valid date'),
  body('cost_per_day')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Cost per day must be a positive number')
];

// Feed log validation
const validateFeedLog = [
  body('pen_id')
    .isInt({ min: 1 })
    .withMessage('Pen ID must be a positive integer'),
  body('feed_date')
    .isISO8601()
    .withMessage('Feed date must be a valid date'),
  body('total_amount_kg')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Total amount must be a positive number')
];

// Investor validation
const validateInvestor = [
  body('user_id')
    .isInt({ min: 1 })
    .withMessage('User ID must be a positive integer'),
  body('investment_amount')
    .isFloat({ min: 0 })
    .withMessage('Investment amount must be a positive number'),
  body('expected_return_percentage')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Expected return percentage must be between 0 and 100')
];

module.exports = {
  handleValidationErrors,
  validateId,
  validatePagination,
  validatePen,
  validatePenAssignment,
  validateWeightRecord,
  validateBreedingEvent,
  validatePregnancyCheck,
  validateBirth,
  validateVaccination,
  validateTreatment,
  validateMortality,
  validateFeedRation,
  validateFeedLog,
  validateInvestor
};