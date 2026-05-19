import { describe, expect, it, vi, beforeEach } from 'vitest';

const { getSystemSettingsMock, updateSystemSettingsMock } = vi.hoisted(() => ({
  getSystemSettingsMock: vi.fn(),
  updateSystemSettingsMock: vi.fn(),
}));

vi.mock('../services/systemSettingsService.js', () => ({
  getSystemSettings: getSystemSettingsMock,
  updateSystemSettings: updateSystemSettingsMock,
}));

import {
  getSystemSettingsController,
  updateSystemSettingsController,
} from './systemSettingsController.js';

function createRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe('systemSettingsController', () => {
  beforeEach(() => {
    getSystemSettingsMock.mockReset();
    updateSystemSettingsMock.mockReset();
  });

  it('GET returns singleton settings', async () => {
    const settings = { singletonKey: 'SYSTEM_SETTINGS' };
    getSystemSettingsMock.mockResolvedValue(settings);

    const req: any = {};
    const res = createRes();

    await getSystemSettingsController(req, res);

    expect(getSystemSettingsMock).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'OK',
      data: settings,
    });
  });

  it('PUT rejects non-admin roles', async () => {
    const req: any = { user: { role: 'viewer' }, body: {} };
    const res = createRes();

    await updateSystemSettingsController(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(updateSystemSettingsMock).not.toHaveBeenCalled();
  });

  it('PUT rejects invalid payload with 400', async () => {
    const req: any = {
      user: { role: 'admin', id: '507f1f77bcf86cd799439011' },
      body: {
        defaultEstateName: '',
        defaultBagCapacityKg: 0,
        systemCurrency: 'ABC',
        realTimeNotificationsEnabled: true,
      },
    };
    const res = createRes();

    await updateSystemSettingsController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(updateSystemSettingsMock).not.toHaveBeenCalled();
  });

  it('PUT updates settings for admin role', async () => {
    const payload = {
      defaultEstateName: 'Amaravathi Tea Estates',
      defaultBagCapacityKg: 50,
      systemCurrency: 'INR',
      realTimeNotificationsEnabled: true,
    };
    const updated = { ...payload, singletonKey: 'SYSTEM_SETTINGS' };
    updateSystemSettingsMock.mockResolvedValue(updated);

    const req: any = {
      user: { role: 'admin', id: '507f1f77bcf86cd799439011' },
      body: payload,
    };
    const res = createRes();

    await updateSystemSettingsController(req, res);

    expect(updateSystemSettingsMock).toHaveBeenCalledWith(
      payload,
      '507f1f77bcf86cd799439011',
    );
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Updated',
      data: updated,
    });
  });
});
