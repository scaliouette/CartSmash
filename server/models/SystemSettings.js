const mongoose = require('mongoose');

const systemSettingsSchema = new mongoose.Schema({
  settingKey: {
    type: String,
    required: true,
    unique: true
  },
  settingValue: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  category: {
    type: String,
    enum: ['routes', 'api', 'features', 'general'],
    default: 'general'
  },
  description: {
    type: String
  },
  updatedBy: {
    type: String
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for faster lookups
systemSettingsSchema.index({ settingKey: 1 });
systemSettingsSchema.index({ category: 1 });

// Static method to get a setting value
systemSettingsSchema.statics.getSetting = async function(key, defaultValue = null) {
  const setting = await this.findOne({ settingKey: key });
  return setting ? setting.settingValue : defaultValue;
};

// Static method to set a setting value
systemSettingsSchema.statics.setSetting = async function(key, value, category = 'general', description = '', updatedBy = 'system') {
  return this.findOneAndUpdate(
    { settingKey: key },
    {
      settingValue: value,
      category,
      description,
      updatedBy,
      updatedAt: new Date()
    },
    { upsert: true, new: true }
  );
};

// Static method to get all settings by category
systemSettingsSchema.statics.getByCategory = async function(category) {
  const settings = await this.find({ category });
  const result = {};
  settings.forEach(setting => {
    result[setting.settingKey] = setting.settingValue;
  });
  return result;
};

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);