import { View, StyleSheet, Image, FlatList, RefreshControl } from "react-native";
import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { useDocumentRequestsUser } from "@/src/hooks/useDocumentRequestsUser";
import { AppText, Button, Screen, ZapcashLoading } from "@/src/components";
import { IMAGES } from "@/src/constants/images";
import { colors, spacing } from "@/src/theme";
import ErrorContainer from "@/src/components/ErrorContainer";
import { commonStyles } from "@/src/utils/common-styles";
import { DocumentRequest } from "@/src/services/user/userService";
import { DocumentRequestCard } from "@/src/components/documents/DocumentRequestCard";
import { DocumentsHeader } from "@/src/components/documents/DocumentsHeader";

export default function DocumentsTab() {
  const { data, isLoading, error, refetch, isRefetching } = useDocumentRequestsUser();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Refresh requests every time the tab comes into focus
  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch])
  );

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch]);

  if (isLoading) {
    return <ZapcashLoading visible={true} title="Loading documents" />;
  }

  if (error) {
    return (
      <Screen scroll={false} edges={[]}>
        <View style={commonStyles.fullCenter}>
          <ErrorContainer responseError={error?.message} />
        </View>
      </Screen>
    );
  }

  const documents: DocumentRequest[] = data?.data ?? [];
  const hasNoDocuments = documents.length === 0;
  const refreshing = isRefetching || isRefreshing;

  if (hasNoDocuments) {
    return (
      <Screen scroll={false} edges={[]}>
        <View style={commonStyles.fullCenter}>
          <View style={styles.emptyImageContainer}>
            <Image
              source={IMAGES.NO_PENDING_DOCUMENTS}
              resizeMode="contain"
              style={styles.emptyImage}
              accessibilityLabel="No pending documents"
            />
          </View>
          <AppText variant="caption" color="black" style={styles.subtitle}>
            No pending documents. we’ll notify you if anything is required
          </AppText>
          <Button
            title="Refresh"
            onPress={onRefresh}
            loading={refreshing}
            variant="primary"
            size="large"
            fullWidth
            accessibilityLabel="Refresh documents list"
            style={styles.emptyCta}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll={false} edges={[]}>
      <FlatList
        data={documents}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <DocumentRequestCard item={item} onUploadSuccess={refetch} />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={<DocumentsHeader />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary.main}
          />
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  emptyImageContainer: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  emptyImage: {
    width: 200,
    height: 200,
  },
  subtitle: {
    textAlign: "center",
    marginBottom: spacing.base,
  },
  // Stretch so `fullWidth` Button fills horizontal padding (parent is alignItems: center).
  emptyCta: {
    marginTop: spacing.base,
    alignSelf: "stretch",
  },
  description: {
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  listContent: {
    padding: spacing.base,
    paddingBottom: spacing["2xl"],
  },
});
