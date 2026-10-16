import { captureScreen } from 'react-native-view-shot';
import { FLOW_CONFIG, getPhaseByIndex } from '@/src/config/flowSteps';
import { useFlowStore } from '@/src/store/useFlowStore';
import { useSupportPrefillStore } from '@/src/store/supportPrefillStore';
import type { DocumentFile } from '@/src/utils/documentFilePicker';

export async function prepareLoanJourneySupport(): Promise<string> {
  const { phaseIndex, substepIndex } = useFlowStore.getState();
  const phase = FLOW_CONFIG[getPhaseByIndex(phaseIndex)];
  const step = phase.substeps[Math.max(0, Math.min(substepIndex, phase.substeps.length - 1))];
  const id = `${Date.now()}`;
  let attachment: DocumentFile | null = null;
  try {
    const uri = await captureScreen({ format: 'png', result: 'tmpfile' });
    attachment = { uri, name: `loan-journey-${step.id}.png`, mimeType: 'image/png' };
  } catch {
    // Keep support accessible when the device cannot capture the screen.
  }
  useSupportPrefillStore.getState().setPrefill({ id, screenLabel: step.label, attachment });
  return id;
}
