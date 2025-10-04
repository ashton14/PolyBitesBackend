import express from 'express';
import { getProfiles, getProfileById, getProfileByAuthId, createProfile, updateProfile, deleteProfile, checkUserExists } from '../controllers/profileController.js';

const router = express.Router();

router.get('/', getProfiles);
router.get('/check-user', checkUserExists);
router.get('/auth/:auth_id', getProfileByAuthId);
router.get('/:id', getProfileById);
router.post('/', createProfile);
router.put('/auth/:auth_id', updateProfile);
router.delete('/auth/:auth_id', deleteProfile);

export default router;