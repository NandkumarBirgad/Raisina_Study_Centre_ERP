import Transaction from '../models/Transaction.js';
import { resolveCenterScope, ensureCenterScope } from '../utils/accessControl.js';

// Get all transactions
export const getAllTransactions = async (req, res) => {
  try {
    const { 
      center, 
      type, 
      category, 
      startDate, 
      endDate, 
      page = 1, 
      limit = 10 
    } = req.query;
    
    const query = { deleted: false };

    const scope = await resolveCenterScope(req, { includeAccountant: true });
    if (scope.denied) {
      return res.status(scope.status || 403).json({ error: scope.reason });
    }
    
    if (center) query.center = center;
    if (type) query.type = type;
    if (category) query.category = category;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    if (!scope.hasFullAccess) {
      const allowedCenters = scope.centerIds;
      if (query.center) {
        if (!allowedCenters.includes(query.center.toString())) {
          return res.status(403).json({ error: 'You are not authorized to access transactions for this center' });
        }
      } else {
        query.center = { $in: allowedCenters };
      }
    }

    const transactions = await Transaction.find(query)
      .populate('center', 'centerName city state')
      .populate('admission', 'rscNumber studentName')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ date: -1 });

    const count = await Transaction.countDocuments(query);

    res.status(200).json({
      transactions,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get transaction by ID
export const getTransactionById = async (req, res) => {
  try {
    const transaction = await Transaction.findOne({ _id: req.params.id, deleted: false })
      .populate('center', 'centerName city state')
      .populate('admission', 'rscNumber studentName');
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const scopeCheck = await ensureCenterScope(req, transaction.center?._id || transaction.center, { includeAccountant: true });
    if (!scopeCheck.allowed) {
      return res.status(scopeCheck.status || 403).json({ error: scopeCheck.reason });
    }
    
    res.status(200).json(transaction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create new transaction
export const createTransaction = async (req, res) => {
  try {
    const transactionData = req.body;

    if (!transactionData.center) {
      return res.status(400).json({ error: 'Center is required for a transaction' });
    }

    const scopeCheck = await ensureCenterScope(req, transactionData.center, { includeAccountant: true });
    if (!scopeCheck.allowed) {
      return res.status(scopeCheck.status || 403).json({ error: scopeCheck.reason });
    }
    
    const transaction = new Transaction(transactionData);
    await transaction.save();
    
    const populatedTransaction = await Transaction.findById(transaction._id)
      .populate('center', 'centerName city state')

    res.status(201).json(populatedTransaction);
  } catch (error) {
    console.log(error)
    res.status(400).json({ error: error.message });
  }
};

// Update transaction
export const updateTransaction = async (req, res) => {
  try {
    const existingTransaction = await Transaction.findOne({ _id: req.params.id, deleted: false });
    if (!existingTransaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const targetCenter = req.body.center || existingTransaction.center;
    const scopeCheck = await ensureCenterScope(req, targetCenter, { includeAccountant: true });
    if (!scopeCheck.allowed) {
      return res.status(scopeCheck.status || 403).json({ error: scopeCheck.reason });
    }

    const transaction = await Transaction.findOneAndUpdate(
      { _id: req.params.id, deleted: false },
      req.body,
      { new: true, runValidators: true }
    )
      .populate('center', 'centerName city state')
      .populate('admission', 'rscNumber studentName');

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.status(200).json(transaction);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete transaction (soft delete)
export const deleteTransaction = async (req, res) => {
  try {
    const existingTransaction = await Transaction.findById(req.params.id).select('center deleted');
    if (!existingTransaction || existingTransaction.deleted) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const scopeCheck = await ensureCenterScope(req, existingTransaction.center, { includeAccountant: true });
    if (!scopeCheck.allowed) {
      return res.status(scopeCheck.status || 403).json({ error: scopeCheck.reason });
    }

    const transaction = await Transaction.findByIdAndUpdate(
      req.params.id,
      { deleted: true },
      { new: true }
    );
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.status(200).json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get transactions by center
export const getTransactionsByCenter = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = { center: req.params.centerId, deleted: false };

    const scopeCheck = await ensureCenterScope(req, req.params.centerId, { includeAccountant: true });
    if (!scopeCheck.allowed) {
      return res.status(scopeCheck.status || 403).json({ error: scopeCheck.reason });
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const transactions = await Transaction.find(query)
      .populate('center', 'centerName city state')
      .populate('admission', 'rscNumber studentName')
      .sort({ date: -1 });
    
    res.status(200).json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get transaction summary by center
export const getTransactionSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const matchStage = { center: req.params.centerId, deleted: false };

    const scopeCheck = await ensureCenterScope(req, req.params.centerId, { includeAccountant: true });
    if (!scopeCheck.allowed) {
      return res.status(scopeCheck.status || 403).json({ error: scopeCheck.reason });
    }

    if (startDate || endDate) {
      matchStage.date = {};
      if (startDate) matchStage.date.$gte = new Date(startDate);
      if (endDate) matchStage.date.$lte = new Date(endDate);
    }

    const summary = await Transaction.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    const result = {
      credit: { total: 0, count: 0 },
      debit: { total: 0, count: 0 },
      balance: 0
    };

    summary.forEach(item => {
      if (item._id === 'CREDIT') {
        result.credit = { total: item.total, count: item.count };
      } else if (item._id === 'DEBIT') {
        result.debit = { total: item.total, count: item.count };
      }
    });

    result.balance = result.credit.total - result.debit.total;

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get category-wise breakdown
export const getCategoryBreakdown = async (req, res) => {
  try {
    const { startDate, endDate, type } = req.query;
    const matchStage = { center: req.params.centerId, deleted: false };

    const scopeCheck = await ensureCenterScope(req, req.params.centerId, { includeAccountant: true });
    if (!scopeCheck.allowed) {
      return res.status(scopeCheck.status || 403).json({ error: scopeCheck.reason });
    }

    if (type) matchStage.type = type;
    if (startDate || endDate) {
      matchStage.date = {};
      if (startDate) matchStage.date.$gte = new Date(startDate);
      if (endDate) matchStage.date.$lte = new Date(endDate);
    }

    const breakdown = await Transaction.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { type: '$type', category: '$category' },
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.type': 1, '_id.category': 1 } }
    ]);

    res.status(200).json(breakdown);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get transaction details
export const getTransactionDetails = async (req, res) => {
  try {
    const transactionId = req.params.id;
    
    // Get transaction info with populated data
    const transaction = await Transaction.findOne({ 
      _id: transactionId, 
      deleted: false 
    })
      .populate('center', 'centerName city state')
      .populate('admission', 'rscNumber studentName mobileNumber');
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const scopeCheck = await ensureCenterScope(req, transaction.center?._id || transaction.center, { includeAccountant: true });
    if (!scopeCheck.allowed) {
      return res.status(scopeCheck.status || 403).json({ error: scopeCheck.reason });
    }

    res.status(200).json({
      transaction
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error.message });
  }
};