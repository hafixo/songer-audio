import {Auth} from 'aws-amplify'
import {Button, Col, Form, Input, message, Row, Typography} from 'antd'
import React from 'react'
import styles from "./SignUpForm.module.scss";
import auth from 'constants/auth'
import regex from 'constants/regex'
import formatPhone from 'utils/format-phone'

const hasErrors = (fieldsError) => {
  return Object.keys(fieldsError).some((field) => fieldsError[field])
};

class SignUpFormComponent extends React.Component {
  state = {
    formStatus: 'sign-up',
    givenName: '',
    familyName: '',
    emailAddress: '',
    phoneNumber: '',
    code: ''
  };

  componentDidMount() {
    if(document.querySelector('#givenname'))  {
      document.querySelector('#givenname').focus()
    }
  }

  onChange = (e) => {
    this.setState({ [e.target.name]: e.target.value })
  };

  signUp = async ({ givenname, familyname, emailaddress, phonenumber }) => {
    await this.setState({
      givenName: givenname,
      familyName: familyname,
      emailAddress: emailaddress,
      phoneNumber: phonenumber
    });
    const { givenName, familyName, emailAddress, phoneNumber } = this.state;
    /**
     * Auth.signUp requires a password of some kind.
     * Generates a random alphanumeric string of length len
     * @param {number} len
     * @returns {string}
     */
    const pwd = (len) => {
      let retVal = '';
      const chars = auth.PASSWORD_CHARS;
      for(let i = 0, n = chars.length; i < len; ++i) {
        retVal += chars.charAt(Math.random() * n)
      }
      return retVal
    };

    try {
      await Auth.signUp({
        username: emailAddress,
        password: pwd(16),
        attributes: {
          email: emailAddress,
          phone_number: phoneNumber.length ? formatPhone.toE164(phoneNumber) : phoneNumber,
          given_name: givenName,
          family_name: familyName
        }
      });
      message.info('Check your email for a confirmation code.');
      await this.setState({formStatus: 'verify'})

    } catch (err) {
      message.error(err.message)
    }
  };

  handleConfirm = async () => {
    const { emailAddress } = this.state;
    const { getFieldValue } = this.props.form;
    const {onFormSubmit} = this.props;
    try {
      await Auth.confirmSignUp(emailAddress, getFieldValue('code'));
      message.success('Thank you for confirming your email.');
      onFormSubmit();
    } catch (err) {
      console.log(err);
      message.error('Something went wrong.  Please try again.')
    }
  };

  /**
   * Custom form field validator
   * @param rule {*}
   * @param value {string}
   * @param cb {Function}
   */
  validPhoneNumber = (rule, value, cb) => {
    console.log(value.length)
    if (String(value).match(regex.PHONE_REGEX || value.length === 0)) {
      cb()
    } else if (value.length > 0) {
      cb('Please provide a mobile phone number.')
    } else {
      cb('')
    }
  };

  /**
   * Custom form field validator
   * @param rule {*}
   * @param value {string}
   * @param cb {Function}
   */
  validEmail = (rule, value, cb) => {
    if (String(value).match(regex.EMAIL_REGEX)) {
      cb()
    } else if (value.length > 0) {
      cb('Please provide a valid email.')
    } else {
      cb('')
    }
  };

  handleSubmit = (e) => {
    e.preventDefault();
    // eslint-disable-next-line react/prop-types
    this.props.form.validateFields((err, values) => {
      if (!err) {
        this.signUp(values).catch(() => {
          console.log('error')
        })
      }
    })
  };


  /**
   * Resends a verification code via Email or SMS
   * @returns {Promise<void>}
   */
  handleSendNewCode = async () => {
    const { emailAddress } = this.state;
    try {
      Auth.resendSignUp(emailAddress).then(() => {
        message.success(`A new code has been sent to ${emailAddress}`)
      })
    } catch(err) {
      message.error('Something went wrong.  Please try again.')
    }

  };

  render () {
    const { code, emailAddress, familyName, formStatus, givenName, phoneNumber } = this.state;
    const { onFormCancel } = this.props;
    const { Paragraph } = Typography;
    const { getFieldDecorator, getFieldsError } = this.props.form;
    const validCode = () => {
      return code.length !== 6
    };
    return (

      <Row type="flex" justify="center">
        <Col span={24}>
          {formStatus === 'sign-up' && (
            <Form layout="vertical" onSubmit={this.handleSubmit}>
              <Form.Item label="">
                {getFieldDecorator('givenname', {
                  initialValue: givenName,
                  rules: [{ required: false }],
                })(<Input className={styles.formInput} id="given_name" placeholder="First Name"/>)}
              </Form.Item>
              <Form.Item label="">
                {getFieldDecorator('familyname', {
                  initialValue: familyName,
                  rules: [{ required: false }],
                })(<Input className={styles.formInput} id="family_name" placeholder="Last Name"/>)}
              </Form.Item>
              <Form.Item label="">
                {getFieldDecorator('emailaddress', {
                  initialValue: emailAddress,
                  rules: [
                    { required: true, message: 'Please provide a valid email.' },
                    { validator: this.validEmail },
                  ],
                })(
                  <Input
                    id="email"
                    placeholder="Email"
                    className={styles.formInput}
                  />
                )}
              </Form.Item>
              <Form.Item label="">
                {getFieldDecorator('phonenumber', {
                  initialValue: phoneNumber,
                  rules: [
                    { required: false },
                  ],
                })(
                  <Input
                    onKeyUp={formatPhone.onPhoneChange}
                    id="phonenumber"
                    placeholder="Mobile Phone"
                    className={styles.formInput}
                  />
                )}
              </Form.Item>
              <Row type="flex" justify="space-between">
                <Form.Item style={{marginBottom: 0}}>
                  <Button className={styles.cancelButton} onClick={onFormCancel} type="secondary">
                    Cancel
                  </Button>
                </Form.Item>
                <Form.Item style={{marginBottom: 0}}>
                  <Button className={styles.signUpButton} type="primary" htmlType="submit" disabled={hasErrors(getFieldsError())}>
                    Submit
                  </Button>
                </Form.Item>
              </Row>
            </Form>
          )}
          {formStatus === 'verify' && (
            <Form layout="vertical">
              <Row type="flex" justify="center">
              <Paragraph className={styles.codeSentMessage}>Thank you for subscribing. Please, take a moment to confirm your email: <br />
                </Paragraph>
                <Paragraph className={styles.codeSentEmail}>{emailAddress}</Paragraph>
              </Row>
              <Form.Item className={styles.codeInput} label="">
                {getFieldDecorator('code', {
                  initialValue: code,
                  rules: [
                    { required: true, message: 'Please provide your 6-digit confirmation.' },
                    { validator: validCode },
                  ],
                })(
                  <Input
                    id="code"
                    placeholder="- - - - - -"
                    maxLength={6}
                    type="number"
                  />
                )}
              </Form.Item>
                <Paragraph className={styles.resendMessage}>
                  Didn&apos;t receive a code?{' '}
                  {/* eslint-disable-next-line jsx-a11y/anchor-is-valid,jsx-a11y/click-events-have-key-events,jsx-a11y/no-static-element-interactions */}
                  <a onClick={this.handleSendNewCode}>Resend Code</a>
                </Paragraph>
              <Row type="flex" justify="space-between" className={styles.confirmActions}>
                <Form.Item className={styles.confirmAction}>
                  <Button className={styles.cancelButton} onClick={onFormCancel} type="secondary">
                    Cancel
                  </Button>
                </Form.Item>
                <Form.Item className={styles.confirmAction}>
                  <Button className={styles.signUpButton}
                          onClick={this.handleConfirm}
                          type="primary"
                          disabled={hasErrors(getFieldsError())}>
                    Confirm
                  </Button>
                </Form.Item>
              </Row>
            </Form>
          )}
        </Col>
      </Row>
    )
  }
}

const SignUpForm = Form.create()(SignUpFormComponent);
export default SignUpForm