import { View } from "react-native";
import { Button } from "./Button";
import { useGoogleAuth } from "@/src/hooks/useGoogleAuth";

export function GoogleButton() {
    const { promptAsync } = useGoogleAuth();
  return (
   <>
   <View>
      <Button
        title="Login with Google"
        onPress={() => promptAsync()}
      />
    </View>
   </>
  );
}
