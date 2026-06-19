const healthRecordService = require('../service/healthRecord.service');

exports.createHealthRecord = async (req, res, next) => {
  try {
    const healthRecord = await healthRecordService.createHealthRecord(
      req.body,
      req.user
    );

    res.status(201).json({
      success: true,
      message: 'Health record draft created successfully',
      data: healthRecord
    });
  } catch (error) {
     console.log('Create health record error:', error);
    next(error);
  }
};

exports.getHealthRecords = async (req, res, next) => {
  try {
    const result = await healthRecordService.getHealthRecords(req.user, req.query);

    res.status(200).json({
      success: true,
      message: 'Health records fetched successfully',
      data: result.healthRecords,
      pagination: result.pagination
    });
  } catch (error) {
    next(error);
  }
};

exports.getHealthRecordById = async (req, res, next) => {
  try {
    const record = await healthRecordService.getHealthRecordById(req.params.id);

    res.status(200).json({
      success: true,
      data: record
    });
  } catch (error) {
    next(error);
  }
};

exports.updateHealthRecord = async (req, res, next) => {
  try {
    const record = await healthRecordService.updateHealthRecord(
      req.params.id,
      req.body
    );

    res.status(200).json({
      success: true,
      message: 'Health record draft updated successfully',
      data: record
    });
  } catch (error) {
    next(error);
  }
};

exports.finalizeHealthRecord = async (req, res, next) => {
  try {
    const record = await healthRecordService.finalizeHealthRecord(
      req.params.id,
      req.user
    );

    res.status(200).json({
      success: true,
      message: 'Health record finalized successfully',
      data: record
    });
  } catch (error) {
    next(error);
  }
};

exports.softDeleteHealthRecord = async (req, res, next) => {
  try {
    await healthRecordService.softDeleteHealthRecord(req.params.id, req.user);

    res.status(200).json({
      success: true,
      message: 'Health record deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};