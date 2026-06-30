const { newPhoneNumber, getDigitsOnly } = require('./helpers/phoneHelper');
const { getConfig } = require('./helpers/configHelper')
const { getBestVanityNumbers } = require('./helpers/vanityHelper')
const { saveVanityNumbers } = require('./helpers/dynamodbHelper')

exports.handler = async (event) => {
  // TODO implement
  console.log('Event ===> ' , JSON.stringify(event));

  try {
    const callerNumber = event?.Details?.ContactData?.CustomerEndpoint?.Address || event?.newPhoneNumber

    if (!callerNumber) {
      throw new Error('Invalid PhoneNumber');
    }
    
    const newCallerNumber = newPhoneNumber(callerNumber); //Validating the number
    const digitsOnly = getDigitsOnly(newCallerNumber); //Removal of other characters such as +, spaces or dashes

    //Validation: There should be atleast 7 numbers in a phonenumber to create vanity
    if (digitsOnly.length < 7) {
      throw new Error ('Phone number must be atleast 7 digits')
    }

    const { digitToLetters, letterToDigit, preferredWords } = await getConfig()
    
    // finding top 5 vanitynumbers
    const bestFiveVanityNumbers = getBestVanityNumbers({
      digits: digitsOnly,
      digitToLetters,
      letterToDigit,
      preferredWords

    })
    
    const savedItems = await saveVanityNumbers({
      callerNumber: newCallerNumber,
      vanityNumbers: bestFiveVanityNumbers
    });

    const response = {
      callerNumber: newCallerNumber,
      vanity1: savedItems.topThree[0],
      vanity2: savedItems.topThree[1],
      vanity3: savedItems.topThree[2],
      vanityNumbers: savedItems.vanityNumbers.join(', ')
    };

    console.log('Response ==>' , JSON.stringify(response));
    
    return response;
  } catch (error) {
    console.error('Error generating vanity', error);

    return {
      callerNumber:'',
      vanity1: '',
      vanity2: '',
      vanity3: '',
      vanityNumbers:'',
      errorMessage: error.message
    };
  }
};

