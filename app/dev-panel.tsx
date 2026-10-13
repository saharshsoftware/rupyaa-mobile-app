import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { AppText, Button } from '@/src/components';
import { JsonPlaceholderUsers } from '@/src/components/JsonPlaceholderUsers';
import { useFlowStore } from '@/src/store/useFlowStore';
import { FLOW_CONFIG, FLOW_PHASES } from '@/src/config/flowSteps';
import type { FlowPhase } from '@/src/config/flowSteps';
import { RegistrationService } from '@/src/services/registration';
import { storageService } from '@/src/services/storage';
import { devSimulationService } from '@/src/services/devSimulation';
import {
  handlePrivilegedAccessDetected,
  recordJourneyBlockingThreat,
  resetDeviceSecuritySession,
} from '@/src/services/security';
import { useDeviceSecurityStore } from '@/src/store/deviceSecurityStore';
import {
  getApiDebugEntries,
  type ApiDebugEntry,
} from '@/src/services/devDebug/apiDebugStore';
import { devLog } from '@/src/utils';
import { colors, spacing } from '@/src/theme';
import type {
  PersonalDetails,
  SalariedDetails,
  SelfEmployedDetails,
  UnemployedDetails,
  EmploymentType,
} from '@/src/types/registration';

const REGISTRATION_ROUTES = [

  { path: '/loan-journey', label: 'Loan Journey (Wizard)' },
] as const;

// Mock data generators for form testing
const generateValidPersonalDetails = (): PersonalDetails => ({
  name: 'Rajesh Kumar',
  dob: '15/03/1990',
  gender: 'male',
  pincode: '560001',
  pan: 'ABCDE1234F',
  salary: '40000',
});

const generateInvalidPersonalDetails = (): PersonalDetails => ({
  name: 'A', // Too short
  dob: '1990-03-15', // Wrong format
  gender: 'male',
  pincode: '123', // Too short
  pan: 'INVALID', // Invalid PAN
  salary: '', // Empty
});

const generateValidSalariedDetails = (): SalariedDetails => ({
  companyName: 'Infosys Technologies',
  designation: 'Software Engineer',
  netMonthlyIncome: '75000',
  declaredSalaryDay: 1,
});

const generateInvalidSalariedDetails = (): SalariedDetails => ({
  companyName: '', // Empty
  designation: '', // Empty
  netMonthlyIncome: '', // Empty
  declaredSalaryDay: 1,
});

const generateValidSelfEmployedDetails = (): SelfEmployedDetails => ({
  businessName: 'Tech Solutions Pvt Ltd',
  designation: 'Founder',
  netMonthlyIncome: '60000',
  declaredSalaryDay: 1,
});

const generateInvalidSelfEmployedDetails = (): SelfEmployedDetails => ({
  businessName: 'A', // Too short
  designation: '', // Empty
  netMonthlyIncome: '', // Empty
  declaredSalaryDay: 1,
});

const generateValidUnemployedDetails = (): UnemployedDetails => ({
  currentActivity: 'Looking for opportunities in software development',
  netMonthlyIncome: '0',
  declaredSalaryDay: 1,
});

const generateInvalidUnemployedDetails = (): UnemployedDetails => ({
  currentActivity: 'A', // Too short
  netMonthlyIncome: '', // Empty
  declaredSalaryDay: 1,
});

export default function DevPanelScreen() {
  const router = useRouter();
  const [registrationData, setRegistrationData] = useState<object | null>(null);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);
  const [bankFetchFailureEnabled, setBankFetchFailureEnabled] = useState(false);
  const [apiDebugEntries, setApiDebugEntries] = useState<ApiDebugEntry[]>([]);
  const isDeviceCompromised = useDeviceSecurityStore((s) => s.isCompromised);
  const lastSecurityThreat = useDeviceSecurityStore((s) => s.lastThreat);
  const blockingThreats = useDeviceSecurityStore((s) => s.blockingThreats);

  const phaseIndex = useFlowStore((s) => s.phaseIndex);
  const substepIndex = useFlowStore((s) => s.substepIndex);

  const loadData = useCallback(async () => {
    const data = await RegistrationService.getRegistrationData();
    const flowState = useFlowStore.getState();
    const passedSubstepsCount = Object.values(flowState.passedSubsteps).filter(Boolean).length;
    const passedPhasesList = Object.entries(flowState.passedPhases)
      .filter(([, passed]) => passed)
      .map(([phase]) => phase);
    const stepLabel = `flow: phase=${flowState.phaseIndex} substep=${flowState.substepIndex} completed=${flowState.applicationCompleted} | passed: ${passedSubstepsCount} substeps, ${passedPhasesList.length} phases`;
    setRegistrationData(data ?? null);
    setCurrentStep(stepLabel);
    setApiDebugEntries(getApiDebugEntries());
    
    // Load simulation flags
    const bankFetchFailure = await devSimulationService.isBankFetchFailureEnabled();
    setBankFetchFailureEnabled(bankFetchFailure);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleRefreshApiDebug = () => {
    setApiDebugEntries(getApiDebugEntries());
  };

  const handleNavigate = (path: string) => {
    router.push(path as Parameters<typeof router.push>[0]);
  };

  const handleJumpToStep = (phase: FlowPhase, substepIndex: number) => {
    const { goTo } = useFlowStore.getState();
    goTo(phase, substepIndex);
    router.push('/loan-journey' as Parameters<typeof router.push>[0]);
  };

  const handleClearRegistration = () => {
    Alert.alert(
      'Clear Registration',
      'Reset registration data and step. You will start from personal details.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await RegistrationService.clearRegistration();
            await loadData();
          },
        },
      ]
    );
  };

  /** Clear registration + flow, then open loan journey so user can do the full journey from step 1 (e.g. with mock). */
  const handleStartLoanJourneyFromBeginning = () => {
    Alert.alert(
      'Start loan journey from beginning',
      'Clear all registration data and flow progress, then open the loan journey. Use this to run the full flow from step 1 (e.g. with mock API).',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start from beginning',
          onPress: async () => {
            await RegistrationService.clearRegistration();
            await loadData();
            router.push('/loan-journey');
          },
        },
      ]
    );
  };

  const handleClearAllStorage = () => {
    Alert.alert(
      'Clear All Storage',
      'This will reset the app state. You will need to go through onboarding again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await storageService.clearAllAppStorage();
            router.replace('/onboarding');
          },
        },
      ]
    );
  };

  const handleLogToConsole = () => {
    devLog.registrationState(registrationData);
  };

  // Form testing handlers
  const handleFillPersonalDetails = async (valid: boolean) => {
    const data = valid ? generateValidPersonalDetails() : generateInvalidPersonalDetails();
    await RegistrationService.savePersonalDetails(data);
    await loadData();
    Alert.alert(
      'Form Filled',
      `Personal details filled with ${valid ? 'valid' : 'invalid'} data. Navigate to the form to see it.`
    );
  };

  const handleFillSalariedDetails = async (valid: boolean) => {
    const data = valid ? generateValidSalariedDetails() : generateInvalidSalariedDetails();
    await RegistrationService.saveEmploymentType('salaried');
    await RegistrationService.saveEmploymentDetails(data);
    await loadData();
    Alert.alert(
      'Form Filled',
      `Salaried details filled with ${valid ? 'valid' : 'invalid'} data. Navigate to the form to see it.`
    );
  };

  const handleFillSelfEmployedDetails = async (valid: boolean) => {
    const data = valid ? generateValidSelfEmployedDetails() : generateInvalidSelfEmployedDetails();
    await RegistrationService.saveEmploymentType('self_employed');
    await RegistrationService.saveEmploymentDetails(data);
    await loadData();
    Alert.alert(
      'Form Filled',
      `Self-employed details filled with ${valid ? 'valid' : 'invalid'} data. Navigate to the form to see it.`
    );
  };

  const handleFillUnemployedDetails = async (valid: boolean) => {
    const data = valid ? generateValidUnemployedDetails() : generateInvalidUnemployedDetails();
    await RegistrationService.saveEmploymentType('unemployed');
    await RegistrationService.saveEmploymentDetails(data);
    await loadData();
    Alert.alert(
      'Form Filled',
      `Unemployed details filled with ${valid ? 'valid' : 'invalid'} data. Navigate to the form to see it.`
    );
  };

  const handleClearPersonalDetails = () => {
    Alert.alert(
      'Clear Personal Details',
      'Remove personal details from registration data?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            // Clear by saving empty values - forms will show empty state
            await RegistrationService.savePersonalDetails({
              name: '',
              dob: '',
              gender: 'male',
              pincode: '',
              pan: '',
              salary: '',
            });
            await loadData();
          },
        },
      ]
    );
  };

  const handleClearEmploymentDetails = () => {
    Alert.alert(
      'Clear Employment Details',
      'Remove employment type and details from registration data?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            // Clear employment details by saving empty salaried details
            // This will effectively clear the form when user navigates to it
            await RegistrationService.saveEmploymentType('salaried');
            await RegistrationService.saveEmploymentDetails({
              companyName: '',
              designation: '',
              netMonthlyIncome: '',
              declaredSalaryDay: 1,
            });
            await loadData();
          },
        },
      ]
    );
  };

  const handleToggleBankFetchFailure = async () => {
    const newValue = !bankFetchFailureEnabled;
    await devSimulationService.setBankFetchFailure(newValue);
    setBankFetchFailureEnabled(newValue);
    Alert.alert(
      'Simulation Updated',
      `Bank fetch failure simulation ${newValue ? 'enabled' : 'disabled'}. Navigate to Bank Connect step and click "Connect Bank" to see the effect.`
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <ChevronLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <AppText variant="h3" weight="bold" style={styles.title}>
          Dev Panel
        </AppText>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary.main}
          />
        }
      >
        <View style={styles.section}>
          <AppText variant="caption" weight="medium" style={styles.sectionTitle}>
            Current Step
          </AppText>
          <AppText variant="body" style={styles.mono}>
            {currentStep || '—'}
          </AppText>
        </View>

        <View style={styles.section}>
          <AppText variant="caption" weight="medium" style={styles.sectionTitle}>
            Pass Flags
          </AppText>
          <ScrollView
            style={styles.dataBox}
            nestedScrollEnabled
            showsVerticalScrollIndicator
          >
            <AppText variant="caption" style={styles.mono}>
              {(() => {
                const flowState = useFlowStore.getState();
                const passedSubsteps = Object.entries(flowState.passedSubsteps)
                  .filter(([, passed]) => passed)
                  .map(([key]) => key)
                  .sort();
                const passedPhases = Object.entries(flowState.passedPhases)
                  .filter(([, passed]) => passed)
                  .map(([phase]) => phase);
                
                return JSON.stringify(
                  {
                    passedSubsteps: passedSubsteps.length > 0 ? passedSubsteps : 'none',
                    passedPhases: passedPhases.length > 0 ? passedPhases : 'none',
                    totalPassedSubsteps: passedSubsteps.length,
                    totalPassedPhases: passedPhases.length,
                  },
                  null,
                  2
                );
              })()}
            </AppText>
          </ScrollView>
        </View>

        <View style={styles.section}>
          <AppText variant="caption" weight="medium" style={styles.sectionTitle}>
            Registration Data
          </AppText>
          <ScrollView
            style={styles.dataBox}
            nestedScrollEnabled
            showsVerticalScrollIndicator
          >
            <AppText variant="caption" style={styles.mono}>
              {registrationData
                ? JSON.stringify(registrationData, null, 2)
                : 'No data'}
            </AppText>
          </ScrollView>
          <Button
            variant="outline"
            size="small"
            onPress={handleLogToConsole}
            style={styles.logButton}
          >
            Log to Console
          </Button>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <AppText variant="caption" weight="medium" style={styles.sectionTitle}>
              API Debug (Latest)
            </AppText>
            <Button
              variant="outline"
              size="small"
              onPress={handleRefreshApiDebug}
              style={styles.refreshButton}
            >
              Refresh
            </Button>
          </View>
          <ScrollView
            style={styles.dataBox}
            nestedScrollEnabled
            showsVerticalScrollIndicator
          >
            {apiDebugEntries.length > 0 ? (
              apiDebugEntries.map((entry) => (
                <View key={entry.id} style={styles.apiEntry}>
                  <AppText variant="caption" style={styles.mono}>
                    {`${new Date(entry.timestamp).toLocaleTimeString()} ${entry.method} ${entry.path} ${entry.status ?? '-'} ${entry.ok ? 'ok' : 'error'}${entry.durationMs ? ` ${entry.durationMs}ms` : ''}`}
                  </AppText>
                  <AppText variant="caption" style={styles.mono}>
                    {JSON.stringify(entry.response, null, 2)}
                  </AppText>
                </View>
              ))
            ) : (
              <AppText variant="caption" style={styles.mono}>
                No API responses yet.
              </AppText>
            )}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <AppText variant="caption" weight="medium" style={styles.sectionTitle}>
            Form Testing
          </AppText>
          
          <View style={styles.formTestGroup}>
            <AppText variant="caption" style={styles.subsectionTitle}>
              Personal Details
            </AppText>
            <View style={styles.buttonRow}>
              <Button
                variant="outline"
                size="small"
                onPress={() => handleFillPersonalDetails(true)}
                style={styles.testButton}
              >
                Fill Valid
              </Button>
              <Button
                variant="outline"
                size="small"
                onPress={() => handleFillPersonalDetails(false)}
                style={styles.testButton}
              >
                Fill Invalid
              </Button>
              <Button
                variant="outline"
                size="small"
                onPress={handleClearPersonalDetails}
                style={styles.testButton}
              >
                Clear
              </Button>
            </View>
          </View>

          <View style={styles.formTestGroup}>
            <AppText variant="caption" style={styles.subsectionTitle}>
              Salaried Details
            </AppText>
            <View style={styles.buttonRow}>
              <Button
                variant="outline"
                size="small"
                onPress={() => handleFillSalariedDetails(true)}
                style={styles.testButton}
              >
                Fill Valid
              </Button>
              <Button
                variant="outline"
                size="small"
                onPress={() => handleFillSalariedDetails(false)}
                style={styles.testButton}
              >
                Fill Invalid
              </Button>
            </View>
          </View>

          <View style={styles.formTestGroup}>
            <AppText variant="caption" style={styles.subsectionTitle}>
              Self-Employed Details
            </AppText>
            <View style={styles.buttonRow}>
              <Button
                variant="outline"
                size="small"
                onPress={() => handleFillSelfEmployedDetails(true)}
                style={styles.testButton}
              >
                Fill Valid
              </Button>
              <Button
                variant="outline"
                size="small"
                onPress={() => handleFillSelfEmployedDetails(false)}
                style={styles.testButton}
              >
                Fill Invalid
              </Button>
            </View>
          </View>

          <View style={styles.formTestGroup}>
            <AppText variant="caption" style={styles.subsectionTitle}>
              Unemployed Details
            </AppText>
            <View style={styles.buttonRow}>
              <Button
                variant="outline"
                size="small"
                onPress={() => handleFillUnemployedDetails(true)}
                style={styles.testButton}
              >
                Fill Valid
              </Button>
              <Button
                variant="outline"
                size="small"
                onPress={() => handleFillUnemployedDetails(false)}
                style={styles.testButton}
              >
                Fill Invalid
              </Button>
            </View>
          </View>

          <View style={styles.formTestGroup}>
            <Button
              variant="outline"
              size="small"
              onPress={handleClearEmploymentDetails}
              style={styles.clearButton}
            >
              Clear All Employment Data
            </Button>
          </View>
        </View>

        <View style={styles.section}>
          <AppText variant="caption" weight="medium" style={styles.sectionTitle}>
            Jump to Step/Substep
          </AppText>
          <AppText variant="caption" style={styles.sectionSubtitle}>
            Jump to any phase/substep and continue the journey from there.
          </AppText>
          {FLOW_PHASES.map((phase, pIdx) => {
            const phaseConfig = FLOW_CONFIG[phase];
            return (
              <View key={phase} style={styles.jumpPhaseGroup}>
                <AppText variant="caption" style={styles.subsectionTitle}>
                  {phaseConfig.label}
                </AppText>
                {phaseConfig.substeps.map((substep, sIdx) => {
                  const isCurrent =
                    phaseIndex === pIdx && substepIndex === sIdx;
                  return (
                    <TouchableOpacity
                      key={substep.id}
                      style={[
                        styles.jumpSubstepButton,
                        isCurrent && styles.jumpSubstepButtonCurrent,
                      ]}
                      onPress={() => handleJumpToStep(phase, sIdx)}
                      activeOpacity={0.7}
                      accessibilityLabel={`Jump to ${phaseConfig.label} - ${substep.label}`}
                    >
                      <AppText
                        variant="body"
                        weight={isCurrent ? 'bold' : 'medium'}
                        style={[
                          styles.jumpSubstepLabel,
                          isCurrent && styles.jumpSubstepLabelCurrent,
                        ]}
                      >
                        {substep.label}
                        {isCurrent ? ' (current)' : ''}
                      </AppText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            );
          })}
        </View>

        <View style={styles.section}>
          <AppText variant="caption" weight="medium" style={styles.sectionTitle}>
            Security (freeRASP)
          </AppText>
          <AppText variant="caption" style={styles.sectionSubtitle}>
            Simulate root/jailbreak handling without a rooted device. Triggers the same alert and app exit as a real detection.
          </AppText>
          <AppText variant="caption" style={styles.sectionSubtitle}>
            Status: {isDeviceCompromised ? `compromised (${lastSecurityThreat ?? 'unknown'})` : 'ok'}
            {blockingThreats.length > 0
              ? ` | journey blocked: ${blockingThreats.join(', ')}`
              : ''}
          </AppText>
          <Button
            variant="primary"
            size="large"
            fullWidth
            onPress={handlePrivilegedAccessDetected}
            style={styles.actionButton}
          >
            Simulate root detected
          </Button>
          <Button
            variant="outline"
            size="large"
            fullWidth
            onPress={() => recordJourneyBlockingThreat('ADB_ENABLED')}
            style={styles.actionButton}
          >
            Simulate USB debugging (block journey)
          </Button>
          <Button
            variant="outline"
            size="large"
            fullWidth
            onPress={resetDeviceSecuritySession}
            style={styles.actionButton}
          >
            Reset security state
          </Button>
        </View>

        <View style={styles.section}>
          <AppText variant="caption" weight="medium" style={styles.sectionTitle}>
            Loan journey (mock)
          </AppText>
          <AppText variant="caption" style={styles.sectionSubtitle}>
            Start the full loan journey from step 1 with empty forms. Use with useMockApi for end-to-end mock flow.
          </AppText>
          <Button
            variant="primary"
            size="large"
            fullWidth
            onPress={handleStartLoanJourneyFromBeginning}
            style={styles.actionButton}
          >
            Start loan journey from beginning
          </Button>
        </View>

        <View style={styles.section}>
          <AppText variant="caption" weight="medium" style={styles.sectionTitle}>
            Navigate to Form
          </AppText>
          {REGISTRATION_ROUTES.map(({ path, label }) => (
            <TouchableOpacity
              key={path}
              style={styles.routeButton}
              onPress={() => handleNavigate(path)}
              activeOpacity={0.7}
            >
              <AppText variant="body" weight="medium">
                {label}
              </AppText>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <AppText variant="caption" weight="medium" style={styles.sectionTitle}>
            Offer Status Modal
          </AppText>
          <AppText variant="caption" style={styles.sectionSubtitle}>
            Show the full-screen offer status overlay (Verified / Pending / Rejected). The variant shown depends on the current offer in store (from last API response). Open loan journey first or use this to jump there with the modal visible.
          </AppText>
          <Button
            variant="outline"
            size="small"
            onPress={() => {
              useFlowStore.getState().setShowOfferStatusModal(true, 'Verified');
              router.push('/loan-journey' as Parameters<typeof router.push>[0]);
            }}
            style={styles.testButton}
          >
            Show Offer Status Modal
          </Button>
        </View>

        <View style={styles.section}>
          <AppText variant="caption" weight="medium" style={styles.sectionTitle}>
            Bank Connect Simulation
          </AppText>
          <AppText variant="caption" style={styles.sectionSubtitle}>
            Simulate bank statement fetch API failure to test manual upload flow
          </AppText>
          <View style={styles.formTestGroup}>
            <View style={styles.buttonRow}>
              <Button
                variant={bankFetchFailureEnabled ? "primary" : "outline"}
                size="small"
                onPress={handleToggleBankFetchFailure}
                style={styles.testButton}
              >
                {bankFetchFailureEnabled ? 'Disable' : 'Enable'} Bank Fetch Failure
              </Button>
            </View>
            <AppText variant="caption" style={styles.simulationStatus}>
              Status: {bankFetchFailureEnabled ? 'Enabled' : 'Disabled'}
            </AppText>
            <AppText variant="caption" style={styles.simulationHint}>
              When enabled, clicking &quot;Connect Bank&quot; after entering mobile number will simulate API failure and show the manual upload flow instead of auto-linking.
            </AppText>
          </View>
        </View>

        <View style={styles.section}>
          <Button
            variant="outline"
            size="large"
            fullWidth
            onPress={handleClearRegistration}
            style={styles.actionButton}
          >
            Clear Registration Data
          </Button>
          <Button
            variant="danger"
            size="large"
            fullWidth
            onPress={handleClearAllStorage}
            style={styles.actionButton}
          >
            Clear All Storage
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.transparent,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  backButton: {
    marginRight: spacing.base,
  },
  title: {
    color: colors.text.primary,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.xl,
    paddingBottom: spacing['2xl'],
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  refreshButton: {
    marginBottom: spacing.sm,
  },
  sectionSubtitle: {
    color: colors.text.secondary,
    marginBottom: spacing.base,
    opacity: 0.9,
  },
  jumpPhaseGroup: {
    marginBottom: spacing.lg,
    padding: spacing.base,
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  jumpSubstepButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    borderRadius: 6,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border.light,
    backgroundColor: colors.background.primary,
  },
  jumpSubstepButtonCurrent: {
    borderColor: colors.primary.main,
    backgroundColor: colors.info.bg,
  },
  jumpSubstepLabel: {
    color: colors.text.primary,
  },
  jumpSubstepLabelCurrent: {
    color: colors.primary.main,
  },
  mono: {
    fontFamily: 'monospace',
    color: colors.text.primary,
  },
  dataBox: {
    backgroundColor: colors.background.secondary,
    padding: spacing.base,
    borderRadius: 8,
    marginBottom: spacing.sm,
    maxHeight: 200,
  },
  apiEntry: {
    marginBottom: spacing.base,
  },
  logButton: {
    alignSelf: 'flex-start',
  },
  routeButton: {
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  actionButton: {
    marginBottom: spacing.base,
  },
  formTestGroup: {
    marginBottom: spacing.lg,
    padding: spacing.base,
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  subsectionTitle: {
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  testButton: {
    flex: 1,
    minWidth: 100,
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
  },
  clearButton: {
    width: '100%',
  },
  simulationStatus: {
    color: colors.text.secondary,
    marginTop: spacing.sm,
    fontWeight: '600',
  },
  simulationHint: {
    color: colors.text.tertiary,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
});
