
const cohortDuration = 3;
const foundingYear = 1986;

function generateCohorts(){
    let cohorts = [];
    const currentYear = new Date().getFullYear();

    for(let year = currentYear; year >= foundingYear; year--){
        const endYear = year + cohortDuration;
        let cohort = `${year}-${endYear}`;
        cohorts.push(cohort);
    }
    return cohorts;
}

function isValidCohort(cohort){
    const availableCohorts = generateCohorts();
    return availableCohorts.includes(cohort);
}

export {generateCohorts, isValidCohort};