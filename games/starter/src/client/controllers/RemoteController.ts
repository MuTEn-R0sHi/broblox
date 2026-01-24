import { ReplicatedStorage } from "@rbxts/services";
import { REMOTES } from "@rbx/net";
import { Controller } from "@rbx/core";
import { REMOTES_WAIT_TIMEOUT_SECONDS } from "@rbx/constants";

export const RemoteController: Controller & {
  Remotes: { Handshake: RemoteFunction; DoAction: RemoteFunction };
} = {
  Remotes: { Handshake: undefined!, DoAction: undefined! },
  onInit() {
    const folder = ReplicatedStorage.WaitForChild(
      "Remotes",
      REMOTES_WAIT_TIMEOUT_SECONDS
    ) as Folder;
    if (!folder) error("Remotes folder not found");
    this.Remotes.Handshake = folder.WaitForChild(REMOTES.Handshake.name) as RemoteFunction;
    this.Remotes.DoAction = folder.WaitForChild(REMOTES.DoAction.name) as RemoteFunction;
  },
};
