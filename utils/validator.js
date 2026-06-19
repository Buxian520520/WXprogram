/**
 * 表单验证工具模块
 * 提供学生信息、请假等表单的验证规则
 */

/**
 * 校验学号：必须是95开头的五位数
 */
function isValidSno(val) {
  if (!val) return false;
  return /^[9][5]\d{3}$/.test(String(val));
}

/**
 * 校验姓名：2-5个汉字
 */
function isValidName(val) {
  if (!val) return false;
  return /^[一-龥]{2,5}$/.test(val);
}

/**
 * 校验手机号码
 */
function isValidPhone(val) {
  if (!val) return false;
  return /^[1][35789]\d{9}$/.test(val);
}

/**
 * 校验邮箱
 */
function isValidEmail(val) {
  if (!val) return false;
  return /^\w+([-+.]\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*$/.test(val);
}

/**
 * 校验性别
 */
function isValidGender(val) {
  return val === '男' || val === '女';
}

/**
 * 校验日期字符串 YYYY-MM-DD
 */
function isValidDate(val) {
  if (!val) return false;
  const d = new Date(val);
  return d instanceof Date && !isNaN(d) && /^\d{4}-\d{2}-\d{2}$/.test(val);
}

/**
 * 验证学生表单（添加/编辑模式）
 * @param {Object} form - { sno, name, gender, birthday, mobile, email, address }
 * @param {boolean} isEdit - 是否为编辑模式（编辑模式下sno只读不验证格式）
 * @returns {{ valid: boolean, errors: Object }}
 */
function validateStudentForm(form, isEdit) {
  const errors = {};

  // 学号校验（添加模式才校验格式和必填）
  if (!isEdit) {
    if (!form.sno && form.sno !== 0) {
      errors.sno = '学号不能为空';
    } else if (!isValidSno(form.sno)) {
      errors.sno = '学号必须是95开头的五位数';
    }
  }

  // 姓名
  if (!form.name) {
    errors.name = '姓名不能为空';
  } else if (!isValidName(form.name)) {
    errors.name = '姓名必须是2-5个汉字';
  }

  // 性别
  if (!isValidGender(form.gender)) {
    errors.gender = '请选择性别';
  }

  // 出生日期
  if (!form.birthday) {
    errors.birthday = '出生日期不能为空';
  } else if (!isValidDate(form.birthday)) {
    errors.birthday = '出生日期格式不正确';
  }

  // 手机号码
  if (!form.mobile) {
    errors.mobile = '手机号码不能为空';
  } else if (!isValidPhone(form.mobile)) {
    errors.mobile = '手机号码必须符合规范';
  }

  // 邮箱
  if (!form.email) {
    errors.email = '邮箱地址不能为空';
  } else if (!isValidEmail(form.email)) {
    errors.email = '邮箱地址必须符合规范';
  }

  // 家庭住址
  if (!form.address) {
    errors.address = '家庭住址不能为空';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors: errors
  };
}

/**
 * 验证请假表单
 * @param {Object} form - { leaveType, startDate, endDate, reason }
 * @returns {{ valid: boolean, errors: Object }}
 */
function validateLeaveForm(form) {
  const errors = {};

  if (!form.leaveType) {
    errors.leaveType = '请选择请假类型';
  }

  if (!form.startDate) {
    errors.startDate = '请选择开始日期';
  }

  if (!form.endDate) {
    errors.endDate = '请选择结束日期';
  }

  if (form.startDate && form.endDate && form.startDate > form.endDate) {
    errors.endDate = '结束日期不能早于开始日期';
  }

  if (!form.reason) {
    errors.reason = '请输入请假原因';
  } else if (form.reason.length < 5) {
    errors.reason = '请假原因至少5个字符';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors: errors
  };
}

/**
 * 验证教师信息表单
 * @param {Object} form - teacher info fields
 * @returns {{ valid: boolean, errors: Object }}
 */
function validateTeacherForm(form) {
  const errors = {};

  if (!form.name) {
    errors.name = '姓名不能为空';
  } else if (!isValidName(form.name) && form.name.length < 2) {
    errors.name = '姓名至少2个字符';
  }

  if (form.mobile && !isValidPhone(form.mobile)) {
    errors.mobile = '手机号码必须符合规范';
  }

  if (form.email && !isValidEmail(form.email)) {
    errors.email = '邮箱地址必须符合规范';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors: errors
  };
}

module.exports = {
  isValidSno,
  isValidName,
  isValidPhone,
  isValidEmail,
  isValidGender,
  isValidDate,
  validateStudentForm,
  validateLeaveForm,
  validateTeacherForm
};
