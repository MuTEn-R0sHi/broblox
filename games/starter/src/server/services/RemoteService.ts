import { Service, createLogger } from "@rbx/core";
import { ReplicatedStorage } from "@rbxts/services";
import { REMOTES } from "@rbx/net";

const logger = createLogger("RemoteService");

export const RemoteService: Service & {
  Remotes: {
    Handshake: RemoteFunction;
    DoAction: RemoteFunction;
  };
} = {
  Remotes: {
    Handshake: undefined!,
    DoAction: undefined!,
  },

  onInit() {
    logger.debug("Initializing remotes...");
    // Create remotes folder
    let folder = ReplicatedStorage.FindFirstChild("Remotes");
    if (!folder) {
      folder = new Instance("Folder");
      folder.Name = "Remotes";
      folder.Parent = ReplicatedStorage;
    }

    // Create remotes
    const handshake = new Instance("RemoteFunction");
    handshake.Name = REMOTES.Handshake.name;
    handshake.Parent = folder;

    const action = new Instance("RemoteFunction");
    action.Name = REMOTES.DoAction.name;
    action.Parent = folder;

    this.Remotes.Handshake = handshake;
    this.Remotes.DoAction = action;
  },
};
