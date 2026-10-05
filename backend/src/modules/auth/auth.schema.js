import {z} from 'zod';
import {isValidCohort} from '../../utils/cohorts.js';

const registerSchema = z.object({
    email: z.string().trim().toLowerCase().email(),
    password: z.string().min(8).max(72),
    displayName: z.string().trim().min(1),
    role: z.enum(["student", "teacher", "alumni"]),
    cohort: z.string().refine(isValidCohort, { message: 'Niên khóa không hợp lệ' }).optional(),
    className: z.string().trim().min(1).optional(),
    currentCity: z.string().trim().optional(),
    job: z.string().trim().optional(),
    avatarURL: z.string().url().optional()
}).superRefine((data, ctx) => {
    if(data.role === "teacher"){
        return;
    }
    if(data.cohort === undefined){
        ctx.addIssue({
            code: 'custom',
            message: 'Học sinh và cựu học sinh phải có niên khóa',
            path: ['cohort'],
        });
    }
    if(data.className === undefined){
        ctx.addIssue({
            code: 'custom',
            message: 'Học sinh và cựu học sinh phải có lớp',
            path: ['className'],
        });
    }
});
const loginSchema = z.object({
    email: z.string().trim().toLowerCase().email(),
    password: z.string().min(1)
});
export {registerSchema, loginSchema};