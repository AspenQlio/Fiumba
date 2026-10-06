import { formatDeviceTime } from './deviceTime.mjs';

export const get_device_time_declaration = {
  name: "get_device_time",
  description: "Get the current time on the mobile device.",
  returnResultDirectly: true,
  parameters: {
    type: "OBJECT",
    properties: {},
  }
};

export async function execute_get_device_time() {
  return formatDeviceTime();
}
